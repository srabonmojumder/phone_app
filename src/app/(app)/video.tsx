import { CategoryScreen } from '../../components/drive/CategoryScreen';
import { Ic } from '../../constants/icons';

export default function VideosRoute() {
  return (
    <CategoryScreen
      title="Videos"
      subtitle="Clips, recordings, and media previews"
      category="video"
      Icon={Ic.Video}
      accent="#0EA5E9"
    />
  );
}
