import { CategoryScreen } from '../../components/drive/CategoryScreen';
import { Ic } from '../../constants/icons';

export default function ImagesRoute() {
  return (
    <CategoryScreen
      title="Images"
      subtitle="Photo previews and image assets"
      category="image"
      Icon={Ic.Image}
      accent="#059669"
    />
  );
}
