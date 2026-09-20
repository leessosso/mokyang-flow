import { SortingHatFrame } from "@/components/sorting-hat-frame";
import { SORTING_HAT_USER_EMBED } from "@/lib/sorting-hat";

export default function HatPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SortingHatFrame src={SORTING_HAT_USER_EMBED} title="배정 모자" />
    </div>
  );
}
