export async function processImage(source, maxW = 200, maxH = 200) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const draw = (img) => {
            let w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
            const ratio = Math.min(maxW / w, maxH / h, 1);
            canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        if (source instanceof File) {
            const url = URL.createObjectURL(source);
            const img = new Image();
            img.onload = () => { draw(img); URL.revokeObjectURL(url); };
            img.src = url;
        } else { draw(source); }
    });
}