'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { Person, FamilyTree } = require('../src/family-tree.js');

describe('Person', () => {
  it('creates a person with required fields', () => {
    const p = new Person({ id: '1', name: '山田 太郎' });
    assert.equal(p.id, '1');
    assert.equal(p.name, '山田 太郎');
    assert.equal(p.gender, 'other');
    assert.equal(p.birthDate, null);
    assert.equal(p.deathDate, null);
    assert.equal(p.note, '');
  });

  it('creates a person with all fields', () => {
    const p = new Person({
      id: '2',
      name: '山田 花子',
      gender: 'female',
      birthDate: '1990-03-15',
      deathDate: null,
      note: 'テスト',
    });
    assert.equal(p.gender, 'female');
    assert.equal(p.birthDate, '1990-03-15');
    assert.equal(p.note, 'テスト');
  });

  it('throws when id is missing', () => {
    assert.throws(() => new Person({ name: '太郎' }), /id is required/);
  });

  it('throws when name is missing', () => {
    assert.throws(() => new Person({ id: '1' }), /name is required/);
  });

  it('serialises to JSON', () => {
    const p = new Person({ id: '3', name: '山田 次郎', gender: 'male', birthDate: '2000-01-01' });
    const json = p.toJSON();
    assert.deepEqual(json, {
      id: '3',
      name: '山田 次郎',
      gender: 'male',
      birthDate: '2000-01-01',
      deathDate: null,
      note: '',
    });
  });
});

describe('FamilyTree', () => {
  let tree;
  let grandpa, grandma, dad, mom, child1, child2;

  before(() => {
    tree = new FamilyTree();
    grandpa = new Person({ id: 'gp', name: '祖父', gender: 'male', birthDate: '1940-01-01' });
    grandma = new Person({ id: 'gm', name: '祖母', gender: 'female', birthDate: '1942-06-15' });
    dad = new Person({ id: 'dad', name: '父', gender: 'male', birthDate: '1965-04-20' });
    mom = new Person({ id: 'mom', name: '母', gender: 'female', birthDate: '1967-08-10' });
    child1 = new Person({ id: 'c1', name: '子1', gender: 'male', birthDate: '1995-02-28' });
    child2 = new Person({ id: 'c2', name: '子2', gender: 'female', birthDate: '1997-11-05' });

    tree
      .addPerson(grandpa)
      .addPerson(grandma)
      .addPerson(dad)
      .addPerson(mom)
      .addPerson(child1)
      .addPerson(child2)
      .addSpouse('gp', 'gm')
      .addSpouse('dad', 'mom')
      .addParentChild('gp', 'dad')
      .addParentChild('gm', 'dad')
      .addParentChild('dad', 'c1')
      .addParentChild('dad', 'c2')
      .addParentChild('mom', 'c1')
      .addParentChild('mom', 'c2');
  });

  it('adds persons', () => {
    assert.equal(tree.getAllPersons().length, 6);
  });

  it('retrieves a person by id', () => {
    assert.equal(tree.getPerson('dad').name, '父');
  });

  it('throws when person not found', () => {
    assert.throws(() => tree.getPerson('unknown'), /not found/);
  });

  it('throws when adding duplicate person', () => {
    assert.throws(
      () => tree.addPerson(new Person({ id: 'dad', name: '重複' })),
      /already exists/
    );
  });

  it('getChildren returns correct children', () => {
    const children = tree.getChildren('dad');
    assert.equal(children.length, 2);
    const names = children.map(c => c.id).sort();
    assert.deepEqual(names, ['c1', 'c2']);
  });

  it('getParents returns correct parents', () => {
    const parents = tree.getParents('dad');
    assert.equal(parents.length, 2);
    const ids = parents.map(p => p.id).sort();
    assert.deepEqual(ids, ['gm', 'gp']);
  });

  it('getSpouses returns correct spouses', () => {
    const spouses = tree.getSpouses('gp');
    assert.equal(spouses.length, 1);
    assert.equal(spouses[0].id, 'gm');
  });

  it('spouse relation is bidirectional', () => {
    const spouses = tree.getSpouses('gm');
    assert.equal(spouses.length, 1);
    assert.equal(spouses[0].id, 'gp');
  });

  it('throws on self-parent relation', () => {
    assert.throws(() => tree.addParentChild('dad', 'dad'), /cannot be their own parent/);
  });

  it('throws on self-spouse relation', () => {
    assert.throws(() => tree.addSpouse('dad', 'dad'), /cannot be their own spouse/);
  });

  it('removes a person and their relations', () => {
    const tempTree = new FamilyTree();
    tempTree
      .addPerson(new Person({ id: 'a', name: 'A' }))
      .addPerson(new Person({ id: 'b', name: 'B' }))
      .addParentChild('a', 'b');

    tempTree.removePerson('a');
    assert.equal(tempTree.getAllPersons().length, 1);
    assert.deepEqual(tempTree.getParents('b'), []);
  });

  it('serialises and deserialises correctly', () => {
    const json = tree.toJSON();
    const restored = FamilyTree.fromJSON(json);

    assert.equal(restored.getAllPersons().length, 6);
    assert.equal(restored.getChildren('dad').length, 2);
    assert.equal(restored.getSpouses('dad').length, 1);
    assert.equal(restored.getSpouses('dad')[0].id, 'mom');
  });

  it('toJSON has unique spouse pairs', () => {
    const json = tree.toJSON();
    assert.equal(json.spouseRelations.length, 2); // gp-gm and dad-mom
  });
});
