// Presentation mode has its own minimal layout with no auth guard or sidebar
export default function PresentationLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
