#!/bin/bash
# Quick icon generator for hackathon
# This creates simple colored squares as placeholder icons

# Create a simple SVG and convert to PNG at different sizes
cat > icon.svg << 'EOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#dc143c"/>
  <text x="64" y="80" font-size="80" text-anchor="middle" fill="white">📅</text>
</svg>
EOF

echo "Icon template created! To generate actual PNG icons:"
echo "1. Use an online tool like https://convertio.co/svg-png/"
echo "2. Or install imagemagick: brew install imagemagick"
echo "3. Then run: convert icon.svg -resize 16x16 icon16.png"
echo "4. And: convert icon.svg -resize 48x48 icon48.png"
echo "5. And: convert icon.svg -resize 128x128 icon128.png"
echo ""
echo "For now, the extension will work without icons (just won't look pretty)!"
