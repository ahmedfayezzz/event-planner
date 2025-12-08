import { useState, useCallback } from "react";

/**
 * Hook for managing expandable table rows on mobile.
 * Provides state and toggle function for tracking which rows are expanded.
 *
 * Usage:
 * ```tsx
 * const { expandedRows, toggleRow, isExpanded } = useExpandableRows();
 *
 * // In table body:
 * {items.map((item) => (
 *   <React.Fragment key={item.id}>
 *     <TableRow>
 *       ...columns...
 *       <TableCell className="md:hidden">
 *         <Button variant="ghost" size="icon" onClick={() => toggleRow(item.id)}>
 *           {isExpanded(item.id) ? <ChevronUp /> : <ChevronDown />}
 *         </Button>
 *       </TableCell>
 *     </TableRow>
 *     {isExpanded(item.id) && (
 *       <tr className="md:hidden bg-muted/30 border-b">
 *         <td colSpan={...}>...expanded content...</td>
 *       </tr>
 *     )}
 *   </React.Fragment>
 * ))}
 * ```
 */
export function useExpandableRows() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (id: string) => expandedRows.has(id),
    [expandedRows]
  );

  const collapseAll = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  const expandAll = useCallback((ids: string[]) => {
    setExpandedRows(new Set(ids));
  }, []);

  return {
    expandedRows,
    toggleRow,
    isExpanded,
    collapseAll,
    expandAll,
  };
}
