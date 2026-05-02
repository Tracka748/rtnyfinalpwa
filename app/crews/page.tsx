import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/get-user"
import CrewsClient from "@/app/crews/CrewsClient"

export default async function CrewsPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    redirect("/login?redirect=/crews")
  }

  return <CrewsClient userId={user.id} />
}
