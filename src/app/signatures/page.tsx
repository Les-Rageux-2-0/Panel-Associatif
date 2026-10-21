import SignatureFlow from "./SignatureFlow";

export default async function SignaturesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <SignatureFlow token={params.token ?? ""} />;
}
