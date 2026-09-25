export const WORLD_RADIUS = 210;
export const PLAYER = Object.freeze({ maxHp: 160, armor: 2, acceleration: 1.32, steeringResponse: 3.4, hullResponse: 1.65, maxSpeed: 7.2, sailSpeed: 9.2, reverseSpeed: 2.8, turnRate: 1.16, minTurnRadius: 8, radius: 1.7 });
export const CANNON = Object.freeze({ volleyCount: 4, volleyInterval: .3, reload: 3.2, speed: 21, life: 1.65, damage: 22, radius: .28 });
export const ENEMY_CANNON = Object.freeze({ damage: 12, speed: 15, life: 2, reload: 4.6 });
export const TARGET_DEFS = Object.freeze([
  { id: 'corsair', name: '赤帆掠奪船', type: 'ship', hp: 100, radius: 2.25, speed: 3.1, reward: 40, color: 0x9a3935, hostile: true, start: [23, -16] },
  { id: 'frigate', name: '黑潮巡邏船', type: 'ship', hp: 125, radius: 2.45, speed: 2.45, reward: 55, color: 0x35566c, hostile: true, start: [-30, -24] },
  { id: 'shark', name: '尖牙鯊魚', type: 'shark', hp: 70, radius: 1.9, speed: 5.0, reward: 30, color: 0x42677a, fleeing: true, start: [31, 16] },
  { id: 'octopus', name: '赤潮克拉肯', type: 'octopus', hp: 180, radius: 4.5, speed: 1.7, reward: 70, color: 0xa7344e, hostile: true, start: [-39, 18] },
  { id: 'goldfish', name: '黃金魚群', type: 'school', hp: 68, radius: 2.7, speed: 4.7, reward: 35, color: 0xe5aa42, fleeing: true, start: [51, -9] },
  { id: 'submarine', name: '銅翼潛水艇', type: 'submarine', hp: 108, radius: 2.35, speed: 3.8, reward: 60, color: 0x9e6e3e, hostile: true, start: [-48, -23] },
]);
