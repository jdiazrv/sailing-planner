import packageJson from "../../package.json";

const getCommitRef = () =>
  process.env.COMMIT_REF ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  null;

export const getReleaseLabel = () => {
  const version = packageJson.version;
  const commitRef = getCommitRef();

  if (!commitRef) {
    return `v${version} · local`;
  }

  return `v${version} · ${commitRef.slice(0, 7)}`;
};
