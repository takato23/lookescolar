import LandingPageLoader from "@/components/landing/LandingPageLoader";

// Force dynamic rendering to avoid static generation issues with @react-three/drei
export const dynamic = 'force-dynamic';

export default function Home() {
  return <LandingPageLoader />;
}
