import './styles.css';
import { Game } from './game/Game';

const rootElement = document.querySelector<HTMLDivElement>('#app');

if (rootElement === null) {
  throw new Error('Expected #app root element to exist.');
}

const game = new Game(rootElement);

game.start();
