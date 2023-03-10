subinclude("//tools/build_defs:tool")

tool(
    name = "cli",
    srcs = glob(["**/*.mjs"]),
    entry_point = "cli.mjs",
    visibility = ["//..."],
    deps = [
        "//:package_json",
    ],
)
