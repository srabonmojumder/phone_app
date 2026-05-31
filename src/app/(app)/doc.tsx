import { CategoryScreen } from '../../components/drive/CategoryScreen';
import { Ic } from '../../constants/icons';

export default function DocsRoute() {
  return (
    <CategoryScreen
      title="Documents"
      subtitle="PDFs, reports, and editable docs"
      category="doc"
      Icon={Ic.Doc}
      accent="#8B5CF6"
    />
  );
}
