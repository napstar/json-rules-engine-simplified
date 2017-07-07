import {
  listAllFields,
  listAllPredicates,
  listInvalidFields,
  listInvalidPredicates,
  predicatesFromCondition,
  predicatesFromRule,
  validatePredicates,
  validateConditionFields
} from "../src/validation";
import { testInProd } from "./utils";

function conditionsFrom(rules) {
  return rules.map(({ conditions }) => conditions);
}

test("Check predicates", () => {
  const conditions = conditionsFrom([
    { conditions: { firstName: "epty" } },
    { conditions: { age: { greater: 10 } } },
    { conditions: { age: { less: 20 } } },
  ]);

  let predicates = listInvalidPredicates(conditions);
  expect(predicates).toEqual(["epty"]);
});

test("Two field rule ", () => {
  const conditions = conditionsFrom([
    {
      conditions: { firstName: "empty" },
      event: { type: "remove" },
    },
    {
      conditions: { age: { greater: 10 } },
      event: { type: "require" },
    },
    {
      conditions: { age: { less: 20 } },
      event: { type: "hide" },
    },
  ]);

  let predicates = listAllPredicates(conditions);
  expect(predicates).toEqual(["empty", "greater", "less"]);

  let fields = listAllFields(conditions);
  expect(fields).toEqual(["firstName", "age"]);
});

test("3 field rule ", () => {
  const conditions = conditionsFrom([
    {
      conditions: { firstName: "empty" },
      event: { type: "remove" },
    },
    {
      conditions: { age: { greater: 10 } },
      event: { type: "require" },
    },
    { conditions: { age: { less: 20 } } },
    {
      conditions: { firstName: "empty" },
      event: { type: "hide" },
    },
  ]);

  let predicates = listAllPredicates(conditions);
  expect(predicates).toEqual(["empty", "greater", "less"]);

  let fields = listAllFields(conditions);
  expect(fields).toEqual(["firstName", "age"]);
});

test("invalidate predicates", () => {
  let invalidConditions = conditionsFrom([
    {
      event: { type: "remove" },
      conditions: {
        age: {
          wtf: {
            greater: 5,
            less: 70,
          },
        },
      },
    },
  ]);

  expect(listAllPredicates(invalidConditions)).toEqual(["greater", "less", "wtf"]);
  expect(listInvalidPredicates(invalidConditions)).toEqual(["wtf"]);
  expect(() => validatePredicates(invalidConditions)).toThrow();
  expect(() => testInProd(validatePredicates(invalidConditions))).not.toBeUndefined();
});

let schema = {
  properties: {
    firstName: { type: "string" },
    password: { type: "string" },
  },
};

test("invalid field", () => {
  let invalidFieldConditions = conditionsFrom([
    {
      conditions: { lastName: "empty" },
      event: {
        type: "remove",
      },
    },
    {
      conditions: {
        or: [{ lastName: "empty" }, { firstName: "empty" }],
      },
    },
  ]);

  expect(listAllFields(invalidFieldConditions)).toEqual(["lastName", "firstName"]);
  expect(listInvalidFields(invalidFieldConditions, schema)).toEqual([ "lastName",]);
  expect(() => validateConditionFields(invalidFieldConditions, schema)).toThrow();
});

test("invalid OR", () => {
  let invalidOrConditions = conditionsFrom([
    {
      conditions: {
        or: { firstName: "empty" },
      },
      event: { type: "remove" },
    },
  ]);

  expect(() => validate(invalidOrConditions, schema)).toThrow();
});

test("invalid field or", () => {
  let invalidFieldOr = conditionsFrom([
    {
      conditions: {
        firstName: {
          or: {
            is: 10,
            some: 25,
          },
        },
      },
      event: { type: "remove" },
    },
  ]);

  expect(() => predicatesFromRule(invalidFieldOr[0].firstName)).toThrow();
  expect(testInProd(() => predicatesFromRule(invalidFieldOr[0].firstName))).toEqual([]);
  expect(() => validatePredicates(invalidFieldOr, schema)).toThrow();
});

test("invalid field NOT or", () => {
  let invalidFieldNotWithOr = conditionsFrom([
    {
      conditions: {
        not: {
          firstName: "or"
        }
      },
      event: { type: "remove" },
    },
  ]);

  expect(() => validatePredicates(invalidFieldNotWithOr, schema)).toThrow();
});

test("valid field or", () => {
  let validFieldOr = conditionsFrom([
    {
      conditions: {
        firstName: {
          or: [{ is: 10 }, { is: 25 }],
        },
      },
      event: {
        type: "remove",
      },
    },
  ]);

  expect(predicatesFromCondition(validFieldOr[0])).toEqual(["is", "is"]);
  expect(validateConditionFields(validFieldOr, schema)).toBeUndefined();
});

test("extract predicates from when with or & and", () => {
  expect(predicatesFromCondition({ or: [{ is: 1 }, { less: 10 }] })).toEqual([
    "is",
    "less",
  ]);
  expect(predicatesFromCondition({ and: [{ is: 1 }, { less: 10 }] })).toEqual([
    "is",
    "less",
  ]);
});
