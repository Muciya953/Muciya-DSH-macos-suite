# 发布与收录

五包（plugin-library / skill-library / appearance-library / agent-teams / usage）+ 一个纯聚合根包。
**发布路径**：GitHub 仓库 → Release 预构建 tarball（安装方式 A，不依赖 npm）→ 向 awesome-dsh-plugin 投五条 entry。

所有命令都在仓库根执行（`cd Muciya-DSH-plugin-macOS-suite`）。

## 0. 前置检查

```sh
node scripts/check-packages.mjs          # 应打印 174 checks passed across 5 packages
node packages/appearance-library/scripts/build-package.mjs   # 只在改过 src/ 后需要；lib/ 已入库
```

- `lib/` **必须入库**：五个包的 `main` 都指向 `lib/index.js`，从 GitHub 装的用户拿到的是仓库内容，
  没有 `lib/` 就是空包。
- `.gitignore` 已排除 `_backup/`（23M 旧插件归档）、`data/`、`dist/`、`*.tgz`。
- `gh` 需已登录：`gh auth status`（本机为 `Muciya953`，scopes 含 `repo` 即可）。

## 1. 推 GitHub

```sh
git add -A
git commit -m "feat: Muciya macOS suite 2.1.0 — five installable plugins"
gh repo create Muciya-DSH-macos-suite --public --source=. --push
gh repo edit --add-topic dsh-plugin
```

- 仓库必须**公开**，否则无法被收录、也无法 `dsh plugin add github:`。
- `dsh-plugin` topic 是收录硬要求，CI 会检查。

## 2. 打 Release tarball（安装方式 A）

不走 npm，所以每个包预先 `npm pack` 打包，附到 GitHub Release，安装时无需构建授权。

```sh
rm -rf dist && mkdir -p dist
for d in plugin-library skill-library appearance-library agent-teams usage; do
  (cd "packages/$d" && npm pack --pack-destination ../../dist)
done
ls -lh dist
```

产出（`plugin-library` 的 tarball 名来自它保留的上游包名，属正常）：

```
deepseek-ai-dsh-client-ui-plugin-manager-0.2.0-rc.2-fork.1.tgz   65K
muciya-dsh-plugin-skill-library-1.0.0.tgz                        13K
muciya-dsh-plugin-appearance-library-1.0.0.tgz                  8.4M
muciya-dsh-plugin-agent-teams-1.0.0.tgz                          41K
muciya-dsh-plugin-usage-1.0.0.tgz                               276K
```

重命名成可读的资产名（不影响包内 `name`，安装按包内 `name` 走），再传 Release：

```sh
cd dist
mv deepseek-ai-dsh-client-ui-plugin-manager-*.tgz muciya-plugin-library-1.0.0.tgz
cd ..
gh release create v1.0.0 dist/*.tgz \
  --title "Muciya macOS suite 1.0.0" \
  --notes "Five installable DSH plugins: plugin-library, skill-library, appearance-library, agent-teams, usage."
```

资产 URL 形如：

```
https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-plugin-library-1.0.0.tgz
```

把五个 URL 填进 `submission/` 对应条目的 `tarball:` 行（现在那行是注释，删掉行首 `# ` 即生效）。

> 版本号说明：仓库根 `package.json` 是 2.x（聚合身份），五个子包各自 1.0.0，两者独立升。
> Release tag 建议用 `v1.0.0`（子包线），与子包版本对齐更好找。

## 3. 投稿 DSH 插件库（awesome-dsh-plugin）

**等仓库创建满 1 天再提**：对方 CI 会检查仓库年龄，刚建的会被过滤（今天建、明天提即可，重提无副作用）。

现成的五条 entry 在 `submission/`：

```
submission/Muciya953__Muciya-DSH-macos-suite--packages-plugin-library.yml        category: market
submission/Muciya953__Muciya-DSH-macos-suite--packages-skill-library.yml         category: skill
submission/Muciya953__Muciya-DSH-macos-suite--packages-appearance-library.yml    category: theme
submission/Muciya953__Muciya-DSH-macos-suite--packages-agent-teams.yml           category: agi
submission/Muciya953__Muciya-DSH-macos-suite--packages-usage.yml                 category: usage
```

操作：

```sh
gh repo fork awesome-dsh-plugin/awesome-dsh-plugin --clone
cd awesome-dsh-plugin
git checkout -b add-muciya-macos-suite
cp <本仓库>/submission/Muciya953__Muciya-DSH-macos-suite--packages-*.yml data/plugins/
git add data/plugins/Muciya953__Muciya-DSH-macos-suite--packages-*.yml
git commit -m "feat: add Muciya macOS suite (5 plugins)"
gh pr create --fill
```

规则要点（照做即可，不照做会被打回）：

| 要求 | 说明 |
| --- | --- |
| 一插件一文件 | 文件名 `<owner>__<repo>--packages-<sub>.yml`，放在 `data/plugins/` |
| `dsh.bundle.patch` | 五个子包都已声明；只声明 `dsh.client` 不可安装，是最常见被拒原因 |
| 根包不投 | 纯聚合包不收录（只挂别人的插件、自身无行为） |
| `plugin-library` 要在描述里说明是 fork | 保留上游包名 `@deepseek-ai/dsh-client-ui-plugin-manager`，做了本地化 + 市场入口；fork 可收录，但必须说清做了什么 |
| 不手改 README | 目录 README 由维护者脚本生成 |
| 描述必须属实 | 不写营销词、不写没实现的数字，维护者会对照代码 |
| 一个 PR 只动自己的条目 | 别顺手改别人的文件 |

## 4. 装法与验证

装预构建 tarball（推荐，无构建授权）：

```sh
dsh plugin add https://github.com/Muciya953/Muciya-DSH-macos-suite/releases/download/v1.0.0/muciya-dsh-plugin-usage-1.0.0.tgz
```

装仓库内子包（会要求 `allowBuilds`，因为要跑构建）：

```sh
dsh plugin add github:Muciya953/Muciya-DSH-macos-suite/packages/usage
```

本地开发挂载（不装包，直接指向目录）：在 profile 的 `cordis.patch.yml` 里加

```yaml
- insert:
    - id: muciya-usage
      name: ./plugins/muciya-usage/lib/index.js
```

验证三件事：① `dsh plugin list` 里出现五条；② 侧栏出现对应行；③ 宿主日志里有
`[appearance-library] 15 API routes mounted …` / `[schedule-console] 4 API routes …` 这类自检行。

## 5. 版本号怎么升

```sh
# 子包（真正被安装的那个）
cd packages/usage && npm version patch --no-git-tag-version && cd ../..
# 重新打包并覆盖 Release 资产
rm -rf dist && mkdir -p dist
for d in plugin-library skill-library appearance-library agent-teams usage; do (cd "packages/$d" && npm pack --pack-destination ../../dist); done
gh release upload v1.0.1 dist/*.tgz
```

约定：`CHANGELOG.md` 顶部加一节；子包版本与 Release tag 对齐；根包版本只在聚合结构变化时动。

## 常见打回原因（对照自查）

1. `package.json` 缺 `dsh.bundle.patch`，或仓库根没有 `cordis.patch.yml`。
2. 仓库里没有 `lib/`，装上后用不了（`main` 指向不存在的文件）。
3. 仓库创建不足 1 天。
4. 描述里写了没实现的能力，或写了与代码不符的数字。
5. 把根聚合包也投了。
6. `description` 里含 `: `（冒号+空格）却没加引号，YAML 解析成嵌套键。
