import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canEditAssessmentForProject } from "@/lib/authz";
import { AssessmentForm } from "@/components/assessment/AssessmentForm";

export default async function AssessPage({ params }: { params: { id: string; assessmentId: string } }) {
  const session = await getServerSession(authOptions);
  const user = session!.user;

  const allowed = await canEditAssessmentForProject(user, params.id);
  if (!allowed) redirect(`/projects/${params.id}`);

  return <AssessmentForm projectId={params.id} assessmentId={params.assessmentId} />;
}
