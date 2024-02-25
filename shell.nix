let
  pkgs = import <nixpkgs> {};
in pkgs.mkShell {
  packages = with pkgs; [
    agate
    hugo
    (python3.withPackages (python-pkgs: [
      python-pkgs.python-frontmatter
    ]))
  ];
}
