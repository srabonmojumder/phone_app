import { CategoryScreen } from '../../components/drive/CategoryScreen';
import { Ic } from '../../constants/icons';

export default function FilesRoute() {
  return (
    <CategoryScreen
      title="My Files"
      subtitle="Browse every file in your drive"
      category="files"
      Icon={Ic.Folder}
      accent="#10B981"
    />
  );
}
