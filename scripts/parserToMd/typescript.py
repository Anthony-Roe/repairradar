from typing import List, Dict, Set, Tuple
from dataclasses import dataclass
from tree_sitter import Language, Parser, Node
import tree_sitter_typescript
from enum import Enum, auto

# Load TypeScript/TSX languages
TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())
parser = Parser()

class EntityType(Enum):
    FUNCTION = auto()
    COMPONENT = auto()
    HOOK = auto()
    CLASS = auto()
    INTERFACE = auto()
    TYPE = auto()

@dataclass
class TypeCodeEntity:
    """Simplified dataclass with only essential info."""
    name: str
    type: str
    file_path: str
    line_no: int
    signature: str  # Minimal signature string instead of dict
    return_type: str or None # type: ignore

class TypeScriptParser:
    """Simplified parser focusing on essential entity info."""
    
    def __init__(self):
        self.seen_entities: Set[Tuple[str, int, str]] = set()  # (file_path, line_no, type)
        self._NODE_HANDLERS = {
            'function_declaration': self._handle_function,
            'arrow_function': self._handle_function,
            'variable_declaration': self._handle_variable,
            'class_declaration': self._handle_class,
            'interface_declaration': self._handle_type,
            'type_alias_declaration': self._handle_type,
            'method_definition': self._handle_method,
            'export_statement': self._handle_export,
        }

    def parse_typescript_file(self, file_path: str, all_entities: List[TypeCodeEntity]) -> List[TypeCodeEntity]:
        """Parse a TypeScript/TSX file and extract minimal entity info."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        parser.language = TSX_LANGUAGE if file_path.endswith('.tsx') else TS_LANGUAGE
        self.seen_entities.clear()
        entities: List[TypeCodeEntity] = []
        lines = content.splitlines()

        tree = parser.parse(bytes(content, 'utf-8'))
        self._parse_ast(tree.root_node, file_path, lines, entities)

        unique_entities = self._deduplicate_entities(entities)
        all_entities.extend(unique_entities)
        return unique_entities

    def _parse_ast(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str = ""):
        """Recursively parse AST, handling only relevant nodes."""
        node_id = (file_path, node.start_point[0], node.type)
        if node_id in self.seen_entities:
            return
        self.seen_entities.add(node_id)

        if handler := self._NODE_HANDLERS.get(node.type):
            handler(node, file_path, lines, entities, context)

        for child in node.children:
            self._parse_ast(child, file_path, lines, entities, context)

    def _handle_function(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str):
        """Handle function declarations with minimal info."""
        name_node = node.child_by_field_name('name') or node.child_by_field_name('declarator')  # For arrow functions
        name = name_node.text.decode('utf-8') if name_node else node.grammar_name
        qualified_name = f"{context}.{name}" if context else name
        entity_type = self._determine_function_type(node, name, file_path)

        entities.append(TypeCodeEntity(
            name=qualified_name,
            type=entity_type.name,
            file_path=file_path,
            line_no=node.start_point[0] + 1,
            signature=self._get_minimal_signature(node, lines),
            return_type=""
        ))

    def _handle_variable(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str):
        """Handle variable declarations (components/hooks) with minimal info."""
        declarator = node.child_by_field_name('declarator')
        if not declarator or declarator.type != 'variable_declarator':
            return

        name_node = declarator.child_by_field_name('name')
        value_node = declarator.child_by_field_name('value')
        if not name_node:
            return

        name = name_node.text.decode('utf-8')
        entity_type = self._determine_variable_type(name, value_node, file_path)
        if entity_type in (EntityType.COMPONENT, EntityType.HOOK):
            entities.append(TypeCodeEntity(
                name=name,
                type=entity_type.name,
                file_path=file_path,
                line_no=node.start_point[0] + 1,
                signature=self._get_minimal_signature(node, lines),
                return_type=""
            ))

    def _handle_class(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str):
        """Handle class declarations with minimal info."""
        name_node = node.child_by_field_name('name')
        if not name_node:
            return

        name = name_node.text.decode('utf-8')
        is_react_component = self._is_react_component(node)
        entity_type = EntityType.COMPONENT if (is_react_component and file_path.endswith(('.tsx', '.jsx'))) else EntityType.CLASS

        entities.append(TypeCodeEntity(
            name=name,
            type=entity_type.name,
            file_path=file_path,
            line_no=node.start_point[0] + 1,
            signature=self._get_minimal_signature(node, lines),
            return_type=""
        ))

        if body := node.child_by_field_name('body'):
            for child in body.children:
                if child.type == 'method_definition':
                    self._handle_method(child, file_path, lines, entities, name)

    def _handle_method(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str):
        """Handle methods with minimal info."""
        self._handle_function(node, file_path, lines, entities, context)

    def _handle_type(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str):
        """Handle type/interface declarations with minimal info."""
        if name_node := node.child_by_field_name('name'):
            entity_type = EntityType.INTERFACE if node.type == 'interface_declaration' else EntityType.TYPE
            entities.append(TypeCodeEntity(
                name=name_node.text.decode('utf-8'),
                type=entity_type.name,
                file_path=file_path,
                line_no=node.start_point[0] + 1,
                signature=self._get_minimal_signature(node, lines),
                return_type=""
            ))

    def _handle_export(self, node: Node, file_path: str, lines: List[str], entities: List[TypeCodeEntity], context: str):
        """Handle export statements."""
        if declaration := node.child_by_field_name('declaration'):
            self._parse_ast(declaration, file_path, lines, entities, context)

    def _determine_function_type(self, node: Node, name: str, file_path: str) -> EntityType:
        """Determine if a function is a component, hook, or general function."""
        is_tsx = file_path.endswith(('.tsx', '.jsx'))

        if is_tsx and name[0].isupper():
            return EntityType.COMPONENT

        # Hooks start with 'use' and should be lowercase 'u'
        if name.startswith('use') and name[0].islower():
            return EntityType.HOOK

        return EntityType.FUNCTION

    def _determine_variable_type(self, name: str, value_node: Node, file_path: str) -> EntityType | None:
        """Determine if a variable represents a component or hook."""
        is_tsx = file_path.endswith(('.tsx', '.jsx'))

        if not value_node:
            return None

        if is_tsx and name[0].isupper() and value_node.type in ('arrow_function', 'function'):
            return EntityType.COMPONENT

        if name.startswith('use') and name[0].islower():
            return EntityType.HOOK

        return None

    def _is_react_component(self, node: Node) -> bool:
        """Check if a class node extends React.Component or React.PureComponent."""
        heritage_clauses = node.children_by_field_name('heritage_clauses')

        for clause in heritage_clauses:
            text = clause.text.decode('utf-8')
            if 'React.Component' in text or 'React.PureComponent' in text:
                return True

        return False

    def _get_minimal_signature(self, node: Node, lines: List[str]) -> str:
        """Extract a clean, minimal function signature (up to the opening '{')."""
        start_line = node.start_point[0]
        end_line = node.end_point[0]

        # Gather lines from start to end or until `{` is found
        collected_lines = []
        for i in range(start_line, min(end_line + 1, len(lines))):
            line = lines[i]
            collected_lines.append(line)
            if '{' in line:
                break

        # Join and extract up to the first opening curly brace
        full_text = '\n'.join(collected_lines)
        signature = full_text.split('{', 1)[0].strip()

        # Optionally limit the length (still useful)
        return signature[:200]

    def _deduplicate_entities(self, entities: List[TypeCodeEntity]) -> List[TypeCodeEntity]:
        """Deduplicate entities by name, line, and file."""
        seen = set()
        unique_entities = []
        for entity in entities:
            key = (entity.name, entity.line_no, entity.file_path)
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)
        return unique_entities