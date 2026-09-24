import { SortingHatFrame } from "@/components/sorting-hat-frame";
import {
  SORTING_HAT_USER_EMBED,
  meetingIdFromReturnParam,
  sortingHatEmbedSrc,
} from "@/lib/sorting-hat";

export default async function HatPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: returnTo } = await searchParams;
  const meetingId = meetingIdFromReturnParam(returnTo);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SortingHatFrame
        src={sortingHatEmbedSrc(SORTING_HAT_USER_EMBED, meetingId)}
        title="배정 모자"
      />
    </div>
  );
}
