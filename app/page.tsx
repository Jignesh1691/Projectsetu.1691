import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";

export default async function IndexPage() {
  const session = await auth();

  // If not logged in, show the beautiful landing page
  if (!session) {
    return <LandingPage />;
  }

  // If logged in, redirect based on role
  const role = session.user.role;
  console.log("Root Guard - Role:", role);

  if ((role as string)?.toLowerCase() === "admin") {
    redirect("/admin");
  } else {
    redirect("/app");
  }
}
