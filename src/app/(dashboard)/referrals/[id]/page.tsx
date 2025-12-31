import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/supabase/auth";
import { getReferralDetail } from "@/lib/db/referrals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ReferralDetailHeader } from "@/components/referrals/referral-detail-header";
import { ReferralConversation } from "@/components/referrals/referral-conversation";
import { ClaimsPanel } from "@/components/referrals/claims-panel";
import { MessageCircle, FileText, Users, Hand } from "lucide-react";
import type { ParticipantRole } from "@/lib/db/referrals";

interface ReferralDetailPageProps {
  params: Promise<{ id: string }>;
}

const roleLabels: Record<ParticipantRole, string> = {
  creator: "Creator",
  claimant: "Claimant",
  collaborator: "Collaborator",
  observer: "Observer",
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

export default async function ReferralDetailPage({ params }: ReferralDetailPageProps) {
  const userId = await requireUserId();
  const { id } = await params;

  const referral = await getReferralDetail(id);

  if (!referral) {
    notFound();
  }

  const pendingClaimsCount = referral.claims.filter((c) => c.status === "requested").length;

  return (
    <div className="min-h-screen">
      <ReferralDetailHeader referral={referral} currentUserId={userId} />

      <div className="p-4 sm:p-8">
        <Tabs defaultValue="conversation" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details" className="gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="conversation" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversation
            </TabsTrigger>
            {referral.isCreator && (
              <TabsTrigger value="claims" className="gap-2">
                <Hand className="h-4 w-4" />
                Claims
                {pendingClaimsCount > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-[20px] px-1.5">
                    {pendingClaimsCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="participants" className="gap-2">
              <Users className="h-4 w-4" />
              Participants
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {referral.description ? (
                  <p className="text-muted-foreground whitespace-pre-wrap">{referral.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided.</p>
                )}
              </CardContent>
            </Card>

            {referral.metadata && Object.keys(referral.metadata as object).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground bg-muted p-4 rounded-lg overflow-auto">
                    {JSON.stringify(referral.metadata, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Conversation Tab */}
          <TabsContent value="conversation">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Conversation
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {referral.isParticipant
                    ? "You can send public comments or private messages to participants."
                    : "You can post public comments on this referral."}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ReferralConversation
                  referralId={referral.id}
                  referralStatus={referral.status}
                  isParticipant={referral.isParticipant}
                  isCreator={referral.isCreator}
                  userRole={referral.userRole}
                  currentUserId={userId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab (Creator only) */}
          {referral.isCreator && (
            <TabsContent value="claims">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hand className="h-5 w-5" />
                    Claims
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Review and manage claims on this referral.
                  </p>
                </CardHeader>
                <CardContent>
                  <ClaimsPanel
                    referralId={referral.id}
                    claims={referral.claims}
                    isCreator={referral.isCreator}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants ({referral.participants.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  People involved in this referral.
                </p>
              </CardHeader>
              <CardContent>
                {referral.participants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No participants yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {referral.participants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(participant.userName, participant.userEmail)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {participant.userName ?? participant.userEmail ?? "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {roleLabels[participant.role]}
                          </p>
                        </div>
                        {participant.userId === userId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

