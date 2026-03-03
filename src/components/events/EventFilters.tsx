interface EventFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function EventFilters({
  categories,
  selectedCategory,
  onCategoryChange
}: EventFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <label className="text-sm text-ink-1" htmlFor="category-filter">
        Category
      </label>
      <select
        id="category-filter"
        className="rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
        value={selectedCategory}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
}
