import { GlassCard } from "@/components/ui";

interface EventFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function EventFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}: EventFiltersProps) {
  return (
    <GlassCard className="flex flex-wrap items-center gap-nova-md">
      <label
        className="text-body text-text-secondary"
        htmlFor="category-filter"
      >
        Category
      </label>
      <select
        id="category-filter"
        className="nova-input nova-select min-h-touch w-auto min-w-[160px]"
        value={selectedCategory}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        {categories.map((category) => (
          <option
            key={category}
            value={category}
            style={{ backgroundColor: "#14141e", color: "#ffffff" }}
          >
            {category}
          </option>
        ))}
      </select>
    </GlassCard>
  );
}
