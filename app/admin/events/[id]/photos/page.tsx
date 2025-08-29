import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPhotosRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/photos?eventId=${id}`);
}
