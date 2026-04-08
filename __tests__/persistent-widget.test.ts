import fs from 'fs';
import path from 'path';

test('persistent-widget embed script exists', () => {
  const p = path.join(__dirname, '..', 'src', 'embed', 'persistent-widget.js');
  expect(fs.existsSync(p)).toBe(true);
  const content = fs.readFileSync(p, 'utf8');
  expect(content).toMatch(/companin-persistent-widget/);
});
