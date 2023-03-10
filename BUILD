filegroup(
    name = "package_json",
    srcs = [
        "package.json",
        "package-lock.json",
    ],
    visibility = ["//..."],
)

filegroup(
    name = "rules",
    srcs = ["//build_defs:javascript"],
    visibility = ["PUBLIC"],
)

filegroup(
    name = "cli",
    srcs = ["//tools/cli"],
    binary = True,
    visibility = ["PUBLIC"],
)

filegroup(
    name = "packagejson-reconciler",
    srcs = ["//tools/packagejson-reconciler"],
    binary = True,
    visibility = ["PUBLIC"],
)
