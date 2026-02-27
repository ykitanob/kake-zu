'use strict';

/**
 * 人物 (Person) クラス
 * Represents an individual in the family tree.
 */
class Person {
  /**
   * @param {object} options
   * @param {string} options.id       - Unique identifier
   * @param {string} options.name     - Full name (氏名)
   * @param {string} [options.gender] - 'male' | 'female' | 'other'
   * @param {string} [options.birthDate] - Birth date (YYYY-MM-DD)
   * @param {string} [options.deathDate] - Death date (YYYY-MM-DD), or null
   * @param {string} [options.note]   - Free-form note
   */
  constructor({ id, name, gender = 'other', birthDate = null, deathDate = null, note = '' }) {
    if (!id) throw new Error('id is required');
    if (!name) throw new Error('name is required');
    this.id = id;
    this.name = name;
    this.gender = gender;
    this.birthDate = birthDate;
    this.deathDate = deathDate;
    this.note = note;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      gender: this.gender,
      birthDate: this.birthDate,
      deathDate: this.deathDate,
      note: this.note,
    };
  }
}

/**
 * 家系図 (FamilyTree) クラス
 * Manages persons and their relationships.
 */
class FamilyTree {
  constructor() {
    /** @type {Map<string, Person>} */
    this.persons = new Map();
    /**
     * Parent-child relationships: parentId -> Set of childIds
     * @type {Map<string, Set<string>>}
     */
    this.parentChildRelations = new Map();
    /**
     * Spouse relationships: personId -> Set of spouseIds
     * @type {Map<string, Set<string>>}
     */
    this.spouseRelations = new Map();
  }

  /**
   * Add a person to the family tree.
   * @param {Person} person
   */
  addPerson(person) {
    if (!(person instanceof Person)) throw new Error('person must be a Person instance');
    if (this.persons.has(person.id)) throw new Error(`Person with id '${person.id}' already exists`);
    this.persons.set(person.id, person);
    this.parentChildRelations.set(person.id, new Set());
    this.spouseRelations.set(person.id, new Set());
    return this;
  }

  /**
   * Get a person by id.
   * @param {string} id
   * @returns {Person}
   */
  getPerson(id) {
    const person = this.persons.get(id);
    if (!person) throw new Error(`Person with id '${id}' not found`);
    return person;
  }

  /**
   * Remove a person and all their relationships.
   * @param {string} id
   */
  removePerson(id) {
    if (!this.persons.has(id)) throw new Error(`Person with id '${id}' not found`);
    this.persons.delete(id);

    // Remove parent-child relations
    this.parentChildRelations.delete(id);
    for (const children of this.parentChildRelations.values()) {
      children.delete(id);
    }

    // Remove spouse relations
    this.spouseRelations.delete(id);
    for (const spouses of this.spouseRelations.values()) {
      spouses.delete(id);
    }

    return this;
  }

  /**
   * Add a parent-child relationship.
   * @param {string} parentId
   * @param {string} childId
   */
  addParentChild(parentId, childId) {
    if (!this.persons.has(parentId)) throw new Error(`Parent '${parentId}' not found`);
    if (!this.persons.has(childId)) throw new Error(`Child '${childId}' not found`);
    if (parentId === childId) throw new Error('A person cannot be their own parent');
    this.parentChildRelations.get(parentId).add(childId);
    return this;
  }

  /**
   * Add a spouse relationship (bidirectional).
   * @param {string} personId1
   * @param {string} personId2
   */
  addSpouse(personId1, personId2) {
    if (!this.persons.has(personId1)) throw new Error(`Person '${personId1}' not found`);
    if (!this.persons.has(personId2)) throw new Error(`Person '${personId2}' not found`);
    if (personId1 === personId2) throw new Error('A person cannot be their own spouse');
    this.spouseRelations.get(personId1).add(personId2);
    this.spouseRelations.get(personId2).add(personId1);
    return this;
  }

  /**
   * Get all children of a person.
   * @param {string} parentId
   * @returns {Person[]}
   */
  getChildren(parentId) {
    if (!this.persons.has(parentId)) throw new Error(`Person '${parentId}' not found`);
    return [...this.parentChildRelations.get(parentId)].map(id => this.persons.get(id));
  }

  /**
   * Get all parents of a person.
   * @param {string} childId
   * @returns {Person[]}
   */
  getParents(childId) {
    if (!this.persons.has(childId)) throw new Error(`Person '${childId}' not found`);
    const parents = [];
    for (const [parentId, children] of this.parentChildRelations) {
      if (children.has(childId)) {
        parents.push(this.persons.get(parentId));
      }
    }
    return parents;
  }

  /**
   * Get all spouses of a person.
   * @param {string} personId
   * @returns {Person[]}
   */
  getSpouses(personId) {
    if (!this.persons.has(personId)) throw new Error(`Person '${personId}' not found`);
    return [...this.spouseRelations.get(personId)].map(id => this.persons.get(id));
  }

  /**
   * Get all persons as an array.
   * @returns {Person[]}
   */
  getAllPersons() {
    return [...this.persons.values()];
  }

  /**
   * Export the family tree as a plain JSON-serialisable object.
   */
  toJSON() {
    const persons = [...this.persons.values()].map(p => p.toJSON());
    const parentChildRelations = [];
    for (const [parentId, children] of this.parentChildRelations) {
      for (const childId of children) {
        parentChildRelations.push({ parentId, childId });
      }
    }
    const spouseRelations = [];
    const seen = new Set();
    for (const [personId, spouses] of this.spouseRelations) {
      for (const spouseId of spouses) {
        const key = [personId, spouseId].sort().join(':');
        if (!seen.has(key)) {
          seen.add(key);
          spouseRelations.push({ personId1: personId, personId2: spouseId });
        }
      }
    }
    return { persons, parentChildRelations, spouseRelations };
  }

  /**
   * Import a family tree from a plain JSON object (as produced by toJSON).
   * @param {object} data
   * @returns {FamilyTree}
   */
  static fromJSON(data) {
    const tree = new FamilyTree();
    for (const p of data.persons) {
      tree.addPerson(new Person(p));
    }
    for (const rel of data.parentChildRelations) {
      tree.addParentChild(rel.parentId, rel.childId);
    }
    for (const rel of data.spouseRelations) {
      tree.addSpouse(rel.personId1, rel.personId2);
    }
    return tree;
  }
}

module.exports = { Person, FamilyTree };
