import { redirect } from 'next/navigation';

export default async function ProjectIndexPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
    const { id, locale } = await params;
    redirect(`/${locale}/project/${id}/dashboard`);
}
