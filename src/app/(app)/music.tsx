import { CategoryScreen } from '../../components/drive/CategoryScreen';
import { Ic } from '../../constants/icons';

export default function MusicRoute() {
  return (
    <CategoryScreen
      title="Music"
      subtitle="Audio tracks and playlists"
      category="music"
      Icon={Ic.Music}
      accent="#3B82F6"
    />
  );
}
