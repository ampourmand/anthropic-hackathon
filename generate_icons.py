#!/usr/bin/env python3
"""
Quick icon generator for hackathon
Creates simple colored PNG icons at different sizes
"""

try:
    from PIL import Image, ImageDraw
    
    def create_icon(size, filename):
        # Create image with red background (UMD colors)
        img = Image.new('RGB', (size, size), color='#dc143c')
        draw = ImageDraw.Draw(img)
        
        # Draw a simple calendar icon with white rectangle
        padding = max(2, size // 5)
        
        # White background for calendar
        draw.rectangle(
            [padding, padding, size-padding, size-padding],
            fill='white'
        )
        
        # Red header bar
        header_height = max(2, size // 6)
        draw.rectangle(
            [padding, padding, size-padding, padding + header_height],
            fill='#dc143c'
        )
        
        # Simple grid lines to look like calendar
        mid = size // 2
        if size > 32:
            # Vertical line
            draw.line([mid, padding + header_height, mid, size-padding], fill='#cccccc', width=1)
            # Horizontal line
            draw.line([padding, mid, size-padding, mid], fill='#cccccc', width=1)
        
        img.save(filename)
        print(f"✓ Created {filename} ({size}x{size})")
    
    # Create icons at required sizes
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    
    print("\n✅ All icons created successfully!")
    print("Your extension is ready to load!")

except ImportError:
    print("⚠️  PIL/Pillow not installed.")
    print("\nQuick fix options:")
    print("1. Install: pip3 install Pillow")
    print("2. Use online tool: https://www.favicon-generator.org/")
    print("3. Skip icons - extension will still work, just won't look as nice!")
    print("\nFor hackathon, option 3 is fastest - just load the extension without icons.")
