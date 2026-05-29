import { FormSkeleton } from "@/components/skeletons";
export default function Loading() {
  return <FormSkeleton fields={5} maxWidth="max-w-2xl" />;
}
