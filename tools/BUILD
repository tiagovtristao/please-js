# This subinclude is currently required for accessing the loaded `CONFIG.JS object`
subinclude("//build_defs:javascript")

genrule(
    name = "parse_package_json",
    srcs = ["ParsePackageJSON.js"],
    cmd = "sed 's|__LIBRARY_LOCATION__|\"%s\"|' $SRC > $OUT" % (package_name(CONFIG.JS.PACKAGE_JSON)),
    outs = ["parse-package-json"],
    binary = True,
    visibility = ["PUBLIC"]
)

genrule(
    name = "tsconfig_transformer",
    srcs = ["TSConfigTransformer.js"],
    cmd = "cp $SRC $OUT",
    outs = ["tsconfig-transformer"],
    binary = True,
    visibility = ["//..."]
)

genrule(
    name = "jest_config_transformer",
    srcs = ["JestConfigTransformer.js"],
    cmd = "cp $SRC $OUT",
    outs = ["jest-config-transformer"],
    binary = True,
    visibility = ["//..."]
)

genrule(
    name = "esbuild_bundler",
    srcs = ["ESBuildBundler.js"],
    cmd = "cp $SRC $OUT",
    outs = ["esbuild-bundler"],
    binary = True,
    visibility = ["//..."]
)

ARCAT_VERSION = "1.0.2"

remote_file(
    name = "arcat",
    url = f"https://github.com/please-build/arcat/releases/download/v{ARCAT_VERSION}/arcat-{ARCAT_VERSION}-{CONFIG.HOSTOS}_{CONFIG.HOSTARCH}",
    binary = True,
    visibility = ["//..."],
)
