/** Store a small thumbnail in the existing private profile row, not a public image bucket. */
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPG, PNG or WebP photo.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('We could not open this photo. Please choose another.');
  }
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw new Error('This photo is too large. Choose a smaller version.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Photos are not available in this browser. Please try another browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    const photo = canvas.toDataURL('image/jpeg', 0.85);
    if (photo.length > 140000)
      throw new Error('This photo is too detailed. Please choose a smaller photo.');
    return photo;
  } finally {
    bitmap.close();
  }
}
