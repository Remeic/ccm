const DEFAULT_DESCRIPTION = "Manage multiple Claude Code profiles";
const DEFAULT_HOMEPAGE = "https://github.com/remeic/ccm";
const DEFAULT_LICENSE = "MIT";

export function getTarballName(packageName, version) {
  const segments = packageName.split("/");
  const name = segments.at(-1);

  return `${name}-${version}.tgz`;
}

export function getNpmTarballUrl(packageName, version) {
  return `https://registry.npmjs.org/${packageName}/-/${getTarballName(packageName, version)}`;
}

export function toFormulaClassName(formulaName) {
  return formulaName
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("");
}

function escapeRubyString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function renderHomebrewFormula({
  formulaName = "ccm",
  packageName,
  version,
  sha256,
  description = DEFAULT_DESCRIPTION,
  homepage = DEFAULT_HOMEPAGE,
  license = DEFAULT_LICENSE,
}) {
  if (!packageName) {
    throw new Error("packageName is required");
  }

  if (!version) {
    throw new Error("version is required");
  }

  if (!sha256) {
    throw new Error("sha256 is required");
  }

  const className = toFormulaClassName(formulaName);
  const url = getNpmTarballUrl(packageName, version);

  return `class ${className} < Formula
  desc "${escapeRubyString(description)}"
  homepage "${escapeRubyString(homepage)}"
  url "${escapeRubyString(url)}"
  sha256 "${escapeRubyString(sha256)}"
  license "${escapeRubyString(license)}"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec/"bin/${formulaName}"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/${formulaName} --version")
  end
end
`;
}
