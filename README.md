# Chester Analytics Platform

Chester-focused Capsim board overview, round review, operating history, competitor maps, and Strategic Priorities Lab. Decisions are attributed to Gengjun Intelligence. Static HTML, CSS and JavaScript; no build or external browser dependencies.

## Add a round

Run `python scripts/build_data.py /path/to/CP137097_1_round_2_2028.xlsx` using Python with numpy and openpyxl. Existing source rounds and the initial pooled round 0/1 scaling remain in `data/`. Rebuild updates every map, pair distance, time control and priority view. Review any new ownership or missing-segment errors before publishing. Each workbook's Production rows and segment tables are retained with cell references. No data is fabricated for unavailable rounds.

Serve `public/` to preview. Publish all files in `public/` to the root of the GitHub repository at https://github.com/Steven-Alexander-Lucardi/competitive-atlas. GitHub Pages serves the main branch at https://steven-alexander-lucardi.github.io/competitive-atlas/.

## Offline version and publication

Run `python scripts/package_offline.py competitive-atlas.html` after importing new rounds to make one HTML file containing the full site and data. Open that file in a browser; no server or internet connection is required. CSV exports and the JSON data download also work offline.

The site is published on GitHub Pages. This source package retains the imported reports and frozen model scales needed for future rounds; only the static public files are published. No unavailable round is fabricated.

## Review tools

The board overview summarizes the complete simulation, financial trajectory, segment strategy, portfolio development and final company standings. Threat scores combine satisfaction (40%), listed potential demand (35%) and exact nine-attribute similarity to Chester (25%); overall weights follow Chester's segment unit sales. The score is an explicit prioritization heuristic, not a prediction of rival behavior.

The round review reconciles net profit through sales, variable costs, depreciation, SG&A, other costs, interest, taxes and profit sharing. It compares product changes with every rival and distinguishes observations from interpretations.

The supply board applies segment growth to listed potential sales, then lets Gengjun Intelligence change demand, target inventory and the stress-test range. Production equals demand plus target stock less existing inventory, floored at zero and capped at twice next-round first-shift capacity. All quantities are thousands of units. The previous report's capacity is only an opening reference; utilization is read directly from the current report.

Capsim sources and formulas are linked in Data & methodology. Theoretical two-shift capacity, a one-year capacity purchase lag and second-shift labor premiums come from official guidance. Alert cutoffs are labeled review rules; the older margin/utilization rubric is not represented as a mandatory Capstone 2.0 target. The simulation is complete through round 8.

## Model

The slide model uses the nine attributes in Competitor Analysis2026_L slide 11. Age, performance, size, MTBF, price, material and labor costs come from Production. Awareness and accessibility come from the relevant segment's Top Products table. Production-only omits those last two attributes. Features are z-standardized using pooled round 0/1 population means and standard deviations separately per segment and cohort. Constant features use a divisor of 1. Scalers are frozen for later imports. Classical MDS jointly embeds all available rounds on common axes (computed by equivalent SVD for Euclidean data). Exact distances, rather than projected map distances, drive rankings. Axes may change when new rounds are appended; distances do not. Stress reports the normalized distance reconstruction error for the displayed round.

Company profiles concatenate the mean standardized primary-product attributes for each of the five segments and divide by sqrt(5), giving segments equal weight. Overall distance is the root mean square of the five segment-profile distances. This measures product strategy similarity, not all corporate strategic choices. Firms missing any primary-segment profile are omitted from that round’s overall map and named in a visible notice. Prior profiles are retained, and unavailable distances or pressure scores are not imputed.

CSS sums all listed products owned by each company within a segment, including cross-segment sales. Marketing equally averages mean listed-product awareness and mean segment accessibility per firm. Marketing avoids repeatedly adding accessibility when a firm has several products. Automation sums Auto. Next Round for primary-segment products and represents next-round settings, not current productivity. Each indicator is divided by the sum across all six firms in that segment. It is a score share, not market share or resource allocation. Color is on a fixed 0–40% share scale, capped visually at 40%, preserving comparability across firms and rounds. Percentages remain uncapped. An absent listed product contributes no CSS; source tables may omit minor products.
