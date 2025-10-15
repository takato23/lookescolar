import { redirect } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default async function EventPhotosRedirect({ params }: PageProps) {
  const { id } = params;
  redirect(`/admin/events/${id}/library`);
}
