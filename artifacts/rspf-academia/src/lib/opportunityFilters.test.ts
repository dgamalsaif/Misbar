import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ResearchOpportunity } from "./researchData";
import { filterOpportunities, uniqueResearchOpportunities } from "./opportunityFilters";

function opportunity(overrides: Partial<ResearchOpportunity> = {}): ResearchOpportunity {
  return {
    id: 1,
    category: "active",
    specialty: "طب القلب",
    specialtyColor: "bg-emerald-100 text-emerald-700",
    country: "المملكة العربية السعودية",
    applicationDeadline: "2026-11-30",
    title: "Heart Health Study",
    titleAr: "دراسة صحة القلب",
    titleEn: "Heart Health Study",
    description: "A public study description",
    descriptionAr: "وصف عام للدراسة",
    descriptionEn: "A public study description",
    seatsLeft: 4,
    totalSeats: 10,
    status: "open",
    priceOriginalSar: 1000,
    priceDiscountedSar: 500,
    journalTarget: "Medical Journal",
    indexedIn: ["Scopus"],
    benefits: [],
    duration: "6 months",
    supervisor: "Study supervisor",
    createdAt: "2026-01-01",
    hiddenFields: [],
    ...overrides,
  };
}

test("search matches Arabic and English text only when the matching field is public", () => {
  const visible = opportunity();
  const hidden = opportunity({
    id: 2,
    title: "",
    titleAr: "",
    titleEn: "",
    specialty: "",
    specialtyAr: "",
    specialtyEn: "",
    hiddenFields: ["title", "specialty"],
  });

  assert.deepEqual(filterOpportunities([visible, hidden], { query: "القلب", fee: "all", minimumSeats: null, country: null, deadlineWithinDays: null }).map((item) => item.id), [1]);
  assert.deepEqual(filterOpportunities([visible, hidden], { query: "Heart Health", fee: "all", minimumSeats: null, country: null, deadlineWithinDays: null }).map((item) => item.id), [1]);
  assert.deepEqual(filterOpportunities([hidden], { query: "Heart Health", fee: "all", minimumSeats: null, country: null, deadlineWithinDays: null }), []);
});

test("specialty search only matches visible specialties", () => {
  const visible = opportunity({ id: 1 });
  const hidden = opportunity({
    id: 2,
    specialty: "",
    specialtyAr: "",
    specialtyEn: "",
    hiddenFields: ["specialty"],
  });

  assert.deepEqual(
    filterOpportunities([visible, hidden], {
      query: "القلب",
      queryField: "specialty",
      fee: "all",
      minimumSeats: null,
      country: null,
      deadlineWithinDays: null,
    }).map((item) => item.id),
    [1],
  );
  assert.deepEqual(
    filterOpportunities([visible], {
      query: "Medical Journal",
      queryField: "specialty",
      fee: "all",
      minimumSeats: null,
      country: null,
      deadlineWithinDays: null,
    }),
    [],
  );
});

test("opportunities with hidden titles remain distinct, while duplicate ids are removed", () => {
  const hiddenTitle = { title: "", titleAr: "", titleEn: "", hiddenFields: ["title", "specialty"] };
  const rows = [
    opportunity({ id: 1, ...hiddenTitle }),
    opportunity({ id: 2, ...hiddenTitle }),
    opportunity({ id: 2, ...hiddenTitle, status: "seats_full" }),
  ];

  assert.deepEqual(uniqueResearchOpportunities(rows).map((item) => item.id), [1, 2]);
});

test("fee filters omit opportunities whose owners hide their fees", () => {
  const free = opportunity({ id: 1, priceOriginalSar: 500, priceDiscountedSar: 0 });
  const paid = opportunity({ id: 2 });
  const hiddenPrice = opportunity({ id: 3, hiddenFields: ["price"] });

  assert.deepEqual(filterOpportunities([free, paid, hiddenPrice], { query: "", fee: "free", minimumSeats: null, country: null, deadlineWithinDays: null }).map((item) => item.id), [1]);
  assert.deepEqual(filterOpportunities([free, paid, hiddenPrice], { query: "", fee: "paid", minimumSeats: null, country: null, deadlineWithinDays: null }).map((item) => item.id), [2]);
  assert.equal(filterOpportunities([free, paid, hiddenPrice], { query: "", fee: "all", minimumSeats: null, country: null, deadlineWithinDays: null }).length, 3);
});

test("price sorting reorders visible prices without moving hidden-price opportunities", () => {
  const expensive = opportunity({ id: 1, priceOriginalSar: 1800, priceDiscountedSar: 1500 });
  const hiddenPrice = opportunity({ id: 2, priceOriginalSar: 100, priceDiscountedSar: 50, hiddenFields: ["price"] });
  const affordable = opportunity({ id: 3, priceOriginalSar: 700, priceDiscountedSar: 400 });
  const filters = { query: "", fee: "all" as const, minimumSeats: null, country: null, deadlineWithinDays: null };

  assert.deepEqual(
    filterOpportunities([expensive, hiddenPrice, affordable], { ...filters, priceSort: "asc" }).map((item) => item.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    filterOpportunities([expensive, hiddenPrice, affordable], { ...filters, priceSort: "desc" }).map((item) => item.id),
    [1, 2, 3],
  );
});

test("seat filters respect owner visibility and minimum thresholds", () => {
  const enough = opportunity({ id: 1, seatsLeft: 5 });
  const few = opportunity({ id: 2, seatsLeft: 2 });
  const hiddenSeats = opportunity({ id: 3, seatsLeft: 20, hiddenFields: ["seats"] });

  assert.deepEqual(filterOpportunities([enough, few, hiddenSeats], { query: "", fee: "all", minimumSeats: 3, country: null, deadlineWithinDays: null }).map((item) => item.id), [1]);
  assert.equal(filterOpportunities([enough, few, hiddenSeats], { query: "", fee: "all", minimumSeats: null, country: null, deadlineWithinDays: null }).length, 3);
});

test("country and closing-date filters use public values only", () => {
  const saudi = opportunity({ id: 1, country: "المملكة العربية السعودية", applicationDeadline: "2026-11-26" });
  const egypt = opportunity({ id: 2, country: "مصر", applicationDeadline: "2026-12-20" });
  const hidden = opportunity({ id: 3, country: "مصر", applicationDeadline: "2026-11-25", hiddenFields: ["country", "deadline"] });
  const filters = { query: "", fee: "all" as const, minimumSeats: null, country: "مصر", deadlineWithinDays: null };
  assert.deepEqual(filterOpportunities([saudi, egypt, hidden], filters, "2026-11-22").map((item) => item.id), [2]);
  assert.deepEqual(
    filterOpportunities([saudi, egypt, hidden], { ...filters, country: null, deadlineWithinDays: 7 }, "2026-11-22").map((item) => item.id),
    [1],
  );
});

test("global detail hiding prevents search from matching hidden descriptive values", () => {
  const item = opportunity();
  assert.deepEqual(
    filterOpportunities([item], {
      query: "Medical Journal",
      fee: "all",
      minimumSeats: null,
      country: null,
      deadlineWithinDays: null,
      includeDetails: false,
    }),
    [],
  );
});
