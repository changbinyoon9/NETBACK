import "server-only";
import { fromFile, type GeoTIFFImage } from "geotiff";
import path from "node:path";

interface RasterInfo {
  image: GeoTIFFImage;
  west: number;
  south: number;
  east: number;
  north: number;
  width: number;
  height: number;
}

let rasterPromise: Promise<RasterInfo> | null = null;

async function getRaster(): Promise<RasterInfo> {
  if (!rasterPromise) {
    rasterPromise = (async () => {
      const file = path.join(process.cwd(), "data", "gebco.tif");
      const tiff = await fromFile(file);
      const image = await tiff.getImage();
      const [west, south, east, north] = image.getBoundingBox();
      return { image, west, south, east, north, width: image.getWidth(), height: image.getHeight() };
    })();
  }
  return rasterPromise;
}

// Returns the raw GEBCO elevation value at (lat, lon): negative below sea
// level, positive/zero on land — matching rasterio's sample() used by the
// Python reference engine exactly (same GeoTIFF, same nearest-pixel read).
export async function sampleElevation(lat: number, lon: number): Promise<number> {
  const { image, west, south, east, north, width, height } = await getRaster();
  const px = Math.floor(((lon - west) / (east - west)) * width);
  const py = Math.floor(((north - lat) / (north - south)) * height);
  if (px < 0 || py < 0 || px >= width || py >= height) {
    throw new Error("Coordinate falls outside the GEBCO raster coverage.");
  }
  const data = await image.readRasters({ window: [px, py, px + 1, py + 1] });
  const band = data[0] as unknown as number[];
  return band[0];
}
