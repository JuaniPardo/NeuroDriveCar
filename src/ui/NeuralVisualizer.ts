import type { BrainSnapshot } from '../ai/Brain';
import { clamp, lerp, remapClamped } from '../utils/math';
import { FONT_MONO, THEME } from '../utils/visualTheme';

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
    ctx.font = `12px ${FONT_MONO}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = THEME.neural.panelTitleColor;
    ctx.fillText('NEURAL VISUALIZER', x + 20, y + 16);
    ctx.fillStyle = THEME.neural.panelSubtitleColor;
    ctx.fillText(
      snapshot === null
        ? 'inputs / hidden / outputs'
        : `${snapshot.inputs.length} inputs / hidden / outputs`,
      x + 20,
      y + 36
    );

    if (snapshot === null) {
      ctx.fillStyle = THEME.neural.outputLabelColor;
      ctx.fillText('No brain data available.', x + 20, y + 66);
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

    const layoutTop = y + 84;
    const layoutBottom = y + height - 48;
    const layerXs = this.getLayerXs(x + 72, x + width - 72, layers.length);
    const layerNodePositions = layers.map((layer, index) =>
      this.getLayerNodePositions(
        layerXs[index],
        layoutTop + 24,
        layoutBottom - 24,
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

      ctx.fillStyle = THEME.neural.panelSubtitleColor;
      ctx.textAlign = 'center';
      ctx.fillText(layer.title, layerXs[layerIndex], layoutTop - 22);

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
    ctx.fillStyle = THEME.hud.panelBackgroundStrong;
    ctx.strokeStyle = THEME.hud.panelBorder;
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
        ? THEME.neural.inactiveConnectionColor
        : weight >= 0
          ? withAlpha(THEME.neural.positiveConnectionColor, alpha)
          : withAlpha(THEME.neural.negativeConnectionColor, alpha);
    ctx.lineWidth = remapClamped(influence, 0, 1, 1, 3.2);
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
    const radius = label === null ? 11 : 14;
    const intensity = clamp(activation, 0, 1);

    ctx.fillStyle = THEME.neural.nodeHaloColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = withAlpha(THEME.neural.nodeWellColor, 0.96);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = withAlpha(
      label === null ? THEME.neural.nodeCoreColor : THEME.neural.outputNodeCoreColor,
      remapClamped(intensity, 0, 1, 0.16, 0.98)
    );
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = THEME.neural.nodeBorderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = THEME.neural.outputLabelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = label === null ? `10px ${FONT_MONO}` : `12px ${FONT_MONO}`;
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
