subinclude("//tools/build_defs:tool")

tool(
    name = "packagejson-reconciler",
    srcs = glob(["**/*.mjs"]),
    entry_point = "packagejson-reconciler.mjs",
    visibility = ["//..."],
    deps = [
        "//:package_json",
    ],
)
