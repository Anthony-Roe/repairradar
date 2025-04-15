import re
from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class CodeEntity:
    name: str
    type: str
    signature: Dict[str, any]
    line_no: int
    file_path: str
    return_type: Optional[str] = None

class PrismaExportParser:
    """Simplified parser focusing on essential entity info."""
    def __init__(self):
        self.patterns = {
            'prisma_model': re.compile(r'model\s+(\w+)\s*{([^}]*)}', re.DOTALL),
            'prisma_enum': re.compile(r'enum\s+(\w+)\s*{([^}]*)}', re.DOTALL),
            'prisma_type': re.compile(r'type\s+(\w+)\s*{([^}]*)}', re.DOTALL),
            'prisma_generator': re.compile(r'generator\s+(\w+)\s*{([^}]*)}', re.DOTALL),
            'prisma_datasource': re.compile(r'datasource\s+(\w+)\s*{([^}]*)}', re.DOTALL),
        }

    def parse_prisma_file(self, file_path: str, all_entities: List[CodeEntity]) -> List[CodeEntity]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Failed to read Prisma file {file_path}: {str(e)}")
            return [CodeEntity("error", "error", {"error": f"Failed to read file: {str(e)}"}, 0, file_path)]

        entities = []
        content_no_comments = re.sub(r'//.*?\n|/\*.*?\*/', '', content, flags=re.DOTALL)

        def get_line_no(match_start: int) -> int:
            return content[:match_start].count('\n') + 1

        for match in self.patterns['prisma_generator'].finditer(content_no_comments):
            name = match.group(1)
            body = match.group(2).strip()
            line_no = get_line_no(match.start())
            config = {line.split('=')[0].strip(): line.split('=')[1].strip() for line in body.split('\n') if line.strip()}
            entity = CodeEntity(name, "prisma_generator", {"config": config}, line_no, file_path)
            entities.append(entity)
            all_entities.append(entity)

        for match in self.patterns['prisma_datasource'].finditer(content_no_comments):
            name = match.group(1)
            body = match.group(2).strip()
            line_no = get_line_no(match.start())
            config = {line.split('=')[0].strip(): line.split('=')[1].strip() for line in body.split('\n') if line.strip()}
            entity = CodeEntity(name, "prisma_datasource", {"config": config}, line_no, file_path)
            entities.append(entity)
            all_entities.append(entity)

        for match in self.patterns['prisma_enum'].finditer(content_no_comments):
            name = match.group(1)
            values = match.group(2).strip().split()
            line_no = get_line_no(match.start())
            entity = CodeEntity(name, "prisma_enum", {"values": values}, line_no, file_path)
            entities.append(entity)
            all_entities.append(entity)

        for match in self.patterns['prisma_model'].finditer(content_no_comments):
            name = match.group(1)
            body = match.group(2).strip()
            line_no = get_line_no(match.start())
            fields, relations, constraints, indexes = self._parse_model_body(body)
            signature = {
                "fields": fields,
                "relations": relations,
                "constraints": constraints,
                "indexes": indexes
            }
            entity = CodeEntity(name, "prisma_model", signature, line_no, file_path)
            entities.append(entity)
            all_entities.append(entity)

        entities.sort(key=lambda x: x.line_no)
        logger.debug(f"Parsed {len(entities)} Prisma entities from {file_path}: {[e.name for e in entities]}")
        return entities

    def _parse_model_body(self, body: str) -> Tuple[List[Dict], List[Dict], List[Dict], List[Dict]]:
        fields = []
        relations = []
        constraints = []
        indexes = []

        for line in body.split('\n'):
            line = line.strip()
            if not line or line.startswith('//'):
                continue

            # Handle model-level attributes (e.g. @@index([field]))
            if line.startswith('@@'):
                attr_match = re.match(r'@@(\w+)\((.+?)\)', line)
                if attr_match:
                    attr_type, attr_value = attr_match.groups()
                    fields_list = [f.strip("[] ") for f in attr_value.split(',')]
                    if attr_type == 'map':
                        constraints.append({"type": "map", "value": attr_value.strip('"')})
                    elif attr_type in {'unique', 'index', 'id'}:
                        entry = {"type": attr_type, "fields": fields_list}
                        if attr_type == 'id':
                            constraints.append(entry)
                        else:
                            indexes.append(entry)
                continue

            parts = line.split()
            if len(parts) < 2:
                continue

            field_name, field_type = parts[0], parts[1]
            field_attrs = ' '.join(parts[2:]) if len(parts) > 2 else ''
            field_data = {
                "name": field_name,
                "type": field_type,
                "attributes": []
            }

            # Parse field-level constraints like @id, @default, @relation
            if field_attrs:
                attrs = self._parse_constraints(field_attrs)
                field_data["attributes"] = attrs
                if '@relation' in field_attrs:
                    rel_info = self._parse_relation(field_attrs)
                    if rel_info:
                        relations.append({"field": field_name, **rel_info})

            fields.append(field_data)

        return fields, relations, constraints, indexes


    def _parse_relation(self, attrs: str) -> Dict:
        match = re.search(r'@relation\(([^)]+)\)', attrs)
        if not match:
            return {}

        relation_body = match.group(1)
        relation_info = {}

        try:
            name_match = re.search(r'name:\s*"([^"]+)"', relation_body)
            if name_match:
                relation_info["name"] = name_match.group(1)

            fields_match = re.search(r'fields:\s*\[([^\]]+)\]', relation_body)
            refs_match = re.search(r'references:\s*\[([^\]]+)\]', relation_body)

            if fields_match:
                relation_info["fields"] = [f.strip().strip('"') for f in fields_match.group(1).split(',')]
            if refs_match:
                relation_info["references"] = [r.strip().strip('"') for r in refs_match.group(1).split(',')]

            for action in ['onDelete', 'onUpdate']:
                a_match = re.search(fr'{action}:\s*(\w+)', relation_body)
                if a_match:
                    relation_info[action] = a_match.group(1)
        except Exception as e:
            return {"error": f"Malformed relation: {str(e)}"}

        return relation_info


    def _parse_constraints(self, attrs: str) -> List[Dict]:
        constraints = []

        # Matches like @default("uuid()") or @map("id")
        patterns = {
            '@id': lambda: {"type": "primary_key"},
            '@unique': lambda: {"type": "unique"},
            '@updatedAt': lambda: {"type": "updated_at"},
        }

        for key, parser in patterns.items():
            if key in attrs:
                constraints.append(parser())

        if '@default' in attrs:
            match = re.search(r'@default\(([^)]+)\)', attrs)
            if match:
                constraints.append({"type": "default", "value": match.group(1).strip('"')})

        if '@map' in attrs:
            match = re.search(r'@map\(([^)]+)\)', attrs)
            if match:
                constraints.append({"type": "map", "value": match.group(1).strip('"')})

        if '@db.' in attrs:
            match = re.search(r'@db\.(\w+)', attrs)
            if match:
                constraints.append({"type": "db_type", "value": match.group(1)})

        return constraints
