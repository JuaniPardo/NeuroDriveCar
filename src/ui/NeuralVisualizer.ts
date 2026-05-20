import type { BrainSnapshot } from '../ai/Brain';
import { clamp, lerp, remapClamped } from '../utils/math';

const PANEL_BACKGROUND_COLOR = 'rgba(5, 15, 19, 0.92)';
const PANEL_BORDER_COLOR = 'rgba(127, 224, 196, 0.24)';
const PANEL_TITLE_COLOR = '#dceee5';
const PANEL_SUBTITLE_COLOR = '#8ca79b';
const NODE_BORDER_COLOR = 'rgba(220, 238, 229, 0.3)';
const OUTPUT_LABEL_COLOR = '#dff4eb';
const INACTIVE_CONNECTION_COLOR = 'rgba(64, 87, 84, 0.16)';
const POSITIVE_CONNECTION_COLOR = 'rgba(135, 255, 224, 1)';
const NEGATIVE_CONNECTION_COLOR = 'rgba(255, 122, 122, 1)';

interface LayerRenderData {
  activations: readonly number[];
  labels: readonly string[] | null;
  title: string;
}

interface NodePosition {
  x: number;
  y: number;
}

export class NeuralVisualizer {
  public render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    snapshot: BrainSnapshot | null
  ): void {
    this.renderPanel(ctx, x, y, width, height);

    ctx.save();
    ctx.font = '11px "SF Mono", Monaco, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = PANEL_TITLE_COLOR;
    ctx.fillText('NEURAL VISUALIZER', x + 16, y + 14);
    ctx.fillStyle = PANEL_SUBTITLE_COLOR;
    ctx.fillText('inputs / hidden / outputs', x + 16, y + 32);

    if (snapshot === null) {
      ctx.fillStyle = OUTPUT_LABEL_COLOR;
      ctx.fillText('No brain data available.', x + 16, y + 62);
      ctx.restore();
      return;
    }

    const outputLayer = snapshot.network.layers[snapshot.network.layers.length - 1];
    const layers: LayerRenderData[] = [
      {
        activations: snapshot.inputs,
        labels: null,
        title: 'INPUTS',
      },
      ...snapshot.hiddenLayers.map((layer, index) => ({
        activations: layer.visualOutputs,
        labels: null,
        title: `HIDDEN ${index + 1}`,
      })),
      {
        activations: outputLayer?.visualOutputs ?? snapshot.visualOutputs,
        labels: ['FWD', 'LEFT', 'RIGHT', 'REV'],
        title: 'OUTPUTS',
      },
    ];

    const layoutTop = y + 58;
    const layoutBottom = y + height - 16;
    const layerXs = this.getLayerXs(x + 40, x + width - 42, layers.length);
    const layerNodePositions = layers.map((layer, index) =>
      this.getLayerNodePositions(
        layerXs[index],
        layoutTop + 20,
        layoutBottom - 12,
        layer.activations.length
      )
    );

    for (let layerIndex = 0; layerIndex < snapshot.network.layers.length; layerIndex += 1) {
      const layerSnapshot = snapshot.network.layers[layerIndex];
      const sourceNodes = layerNodePositions[layerIndex];
      const targetNodes = layerNodePositions[layerIndex + 1];
      const sourceActivations = layers[layerIndex].activations;

      for (let outputIndex = 0; outputIndex < layerSnapshot.outputCount; outputIndex += 1) {
        for (let inputIndex = 0; inputIndex < layerSnapshot.inputCount; inputIndex += 1) {
          this.renderConnection(
            ctx,
            sourceNodes[inputIndex],
            targetNodes[outputIndex],
            sourceActivations[inputIndex],
            layerSnapshot.weights[outputIndex][inputIndex]
          );
        }
      }
    }

    for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
      const layer = layers[layerIndex];
      const nodes = layerNodePositions[layerIndex];

      ctx.fillStyle = PANEL_SUBTITLE_COLOR;
      ctx.textAlign = 'center';
      ctx.fillText(layer.title, layerXs[layerIndex], layoutTop - 6);

      for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
        this.renderNode(
          ctx,
          nodes[nodeIndex],
          layer.activations[nodeIndex],
          layer.labels?.[nodeIndex] ?? null
        );
      }
    }

    ctx.restore();
  }

  private renderPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();
    ctx.fillStyle = PANEL_BACKGROUND_COLOR;
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    ctx.restore();
  }

  private getLayerXs(left: number, right: number, layerCount: number): number[] {
    const xs: number[] = [];

    for (let index = 0; index < layerCount; index += 1) {
      const alpha = layerCount === 1 ? 0.5 : index / (layerCount - 1);
      xs.push(lerp(left, right, alpha));
    }

    return xs;
  }

  private getLayerNodePositions(
    x: number,
    top: number,
    bottom: number,
    count: number
  ): NodePosition[] {
    const positions: NodePosition[] = [];

    for (let index = 0; index < count; index += 1) {
      const alpha = count === 1 ? 0.5 : index / (count - 1);
      positions.push({
        x,
        y: lerp(top, bottom, alpha),
      });
    }

    return positions;
  }

  private renderConnection(
    ctx: CanvasRenderingContext2D,
    source: NodePosition,
    target: NodePosition,
    sourceActivation: number,
    weight: number
  ): void {
    const influence = Math.abs(weight) * clamp(sourceActivation, 0, 1);
    const alpha = remapClamped(influence, 0, 1, 0.08, 0.82);

    ctx.strokeStyle =
      influence < 0.02
        ? INACTIVE_CONNECTION_COLOR
        : weight >= 0
          ? withAlpha(POSITIVE_CONNECTION_COLOR, alpha)
          : withAlpha(NEGATIVE_CONNECTION_COLOR, alpha);
    ctx.lineWidth = remapClamped(influence, 0, 1, 1, 2.8);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
  }

  private renderNode(
    ctx: CanvasRenderingContext2D,
    node: NodePosition,
    activation: number,
    label: string | null
  ): void {
    const radius = label === null ? 9 : 11;
    const intensity = clamp(activation, 0, 1);

    ctx.fillStyle = withAlpha('#0d1b20', 0.96);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = withAlpha('#8ffff0', remapClamped(intensity, 0, 1, 0.1, 0.95));
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = NODE_BORDER_COLOR;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = OUTPUT_LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = label === null ? '9px "SF Mono", Monaco, monospace' : '10px "SF Mono", Monaco, monospace';
    ctx.fillText(label ?? activation.toFixed(2), node.x, node.y);
  }
}

function withAlpha(color: string, alpha: number): string {
  const safeAlpha = clamp(alpha, 0, 1);

  if (color.startsWith('rgba(')) {
    const segments = color.slice(5, -1).split(',').slice(0, 3).map((segment) => segment.trim());

    return `rgba(${segments.join(', ')}, ${safeAlpha})`;
  }

  if (color.startsWith('rgb(')) {
    const segments = color.slice(4, -1).split(',').map((segment) => segment.trim());

    return `rgba(${segments.join(', ')}, ${safeAlpha})`;
  }

  if (color.startsWith('#') && color.length === 7) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);

    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
  }

  return color;
}
