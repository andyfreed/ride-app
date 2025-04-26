import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Function to create an app icon with the specified size
function createAppIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill background with app color
  ctx.fillStyle = '#0057FF';
  ctx.fillRect(0, 0, size, size);
  
  // Calculate rounded corners (20% of size)
  const radius = size * 0.2;
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Draw rounded rectangle
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  
  // Fill with app color
  ctx.fillStyle = '#0057FF';
  ctx.fill();
  
  // Scale for the motorcycle icon (60% of size)
  const iconSize = size * 0.6;
  const centerX = size / 2;
  const centerY = size / 2;
  const iconX = centerX - iconSize / 2;
  const iconY = centerY - iconSize / 2;
  
  // Draw a simple motorcycle icon in white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  
  // Draw a stylized "M" for motorcycle
  const lineWidth = size * 0.05;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = 'white';
  
  // Draw a simplified motorcycle silhouette
  ctx.beginPath();
  // Draw wheels
  const wheelRadius = size * 0.12;
  ctx.arc(iconX + wheelRadius, centerY + wheelRadius, wheelRadius, 0, Math.PI * 2);
  ctx.arc(iconX + iconSize - wheelRadius, centerY + wheelRadius, wheelRadius, 0, Math.PI * 2);
  
  // Draw body
  ctx.moveTo(iconX + wheelRadius * 2, centerY);
  ctx.lineTo(iconX + iconSize - wheelRadius * 2, centerY);
  ctx.moveTo(iconX + iconSize / 2, centerY - wheelRadius);
  ctx.lineTo(iconX + iconSize / 2, centerY - wheelRadius * 2);
  
  // Draw handle
  ctx.moveTo(iconX + iconSize - wheelRadius * 2, centerY - wheelRadius);
  ctx.lineTo(iconX + iconSize - wheelRadius, centerY);
  
  ctx.fill();
  ctx.stroke();
  
  // Draw speed lines
  ctx.beginPath();
  ctx.lineWidth = lineWidth / 1.5;
  ctx.moveTo(iconX + wheelRadius, centerY - wheelRadius * 1.5);
  ctx.lineTo(iconX + iconSize - wheelRadius, centerY - wheelRadius * 1.5);
  ctx.moveTo(iconX + wheelRadius * 1.5, centerY - wheelRadius * 0.5);
  ctx.lineTo(iconX + iconSize - wheelRadius * 1.5, centerY - wheelRadius * 0.5);
  ctx.moveTo(iconX + wheelRadius * 2, centerY + wheelRadius * 2);
  ctx.lineTo(iconX + iconSize - wheelRadius * 2, centerY + wheelRadius * 2);
  ctx.stroke();
  
  // Save the icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, `apple-touch-icon${size > 152 ? `-${size}x${size}` : ''}.png`), buffer);
  console.log(`Created ${size}x${size} icon`);
}

// Create different sizes
createAppIcon(180);
createAppIcon(152);
createAppIcon(120);

console.log('App icons generated successfully');