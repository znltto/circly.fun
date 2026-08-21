// Twitter card image = mesma OG image.
// Não re-exportamos porque o Next 15 não detecta re-exports do metadata
// `runtime` — cada arquivo precisa declarar seu próprio.
import OGImage, {
  alt as ogAlt,
  size as ogSize,
  contentType as ogContentType,
} from "./opengraph-image";

export const runtime = "edge";
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;
export default OGImage;
