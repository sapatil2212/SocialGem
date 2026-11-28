"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { FiCheck, FiMinus } from "react-icons/fi";
import { CAPABILITIES } from "@/content/landing";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});
const helper = createColumnHelper();
const onlyTrue = (row, id) => row.getValue(id) === true;
const mark = (info) =>
  info.getValue() ? <FiCheck role="img" aria-label="Yes" className="sg-yes" /> : <FiMinus role="img" aria-label="No" />;

const columns = helper.columns([
  helper.accessor("platform", { header: "Platform", sortFn: "alphanumeric" }),
  helper.accessor("text", { header: "Text only", enableSorting: false, filterFn: onlyTrue, cell: mark }),
  helper.accessor("photo", { header: "Photo", enableSorting: false, filterFn: onlyTrue, cell: mark }),
  helper.accessor("video", { header: "Video", enableSorting: false, filterFn: onlyTrue, cell: mark }),
  helper.accessor("limit", {
    header: "Caption limit",
    sortFn: "basic",
    cell: (info) => info.getValue().toLocaleString("en-IN"),
  }),
]);

const FILTERS = [["text", "Text only"], ["photo", "Photos"], ["video", "Videos"]];
const ARROWS = { asc: "↑", desc: "↓" };
const ARIA = { asc: "ascending", desc: "descending" };

export default function PlatformTable() {
  const table = useTable({ features, columns, data: CAPABILITIES });
  const active = table.state.columnFilters;

  return (
    <div>
      <div className="sg-choice sg-filters" role="group" aria-label="Show platforms that accept">
        {FILTERS.map(([id, label]) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={active.some((f) => f.id === id)}
              onChange={(e) => table.getColumn(id).setFilterValue(e.target.checked ? true : undefined)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="sg-table" role="region" aria-label="Platform support" tabIndex={0}>
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} scope="col" aria-sort={ARIA[sorted]}>
                      {header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()}>
                          <table.FlexRender header={header} /> <span aria-hidden="true">{ARROWS[sorted] || "↕"}</span>
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}><table.FlexRender cell={cell} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
