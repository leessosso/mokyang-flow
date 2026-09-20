import { SortingHatFrame } from "@/components/sorting-hat-frame";
import { SORTING_HAT_ADMIN_EMBED } from "@/lib/sorting-hat";

export default function HatAdminPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SortingHatFrame src={SORTING_HAT_ADMIN_EMBED} title="배정 관리" />
    </div>
  );
}
