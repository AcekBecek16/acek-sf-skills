#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const command = args[0];
const target = args[1]; // optional: specific skill name, or "--all"

const SKILLS_SRC = path.join(__dirname, '../skills');

// Where each target/tool expects its instruction files, and how to format them.
const TARGETS = {
	'claude-project': {
		label: 'Claude Code — project (./.claude/skills/user)',
		dir: (cwd) => path.join(cwd, '.claude/skills/user'),
		format: 'claude',
		selected: true,
	},
	'claude-global': {
		label: 'Claude Code — global (~/.claude/skills/user)',
		dir: () => path.join(os.homedir(), '.claude/skills/user'),
		format: 'claude',
		selected: false,
	},
	cursor: {
		label: 'Cursor (./.cursor/rules)',
		dir: (cwd) => path.join(cwd, '.cursor/rules'),
		format: 'cursor',
		selected: false,
	},
	windsurf: {
		label: 'Windsurf (./.windsurf/rules)',
		dir: (cwd) => path.join(cwd, '.windsurf/rules'),
		format: 'windsurf',
		selected: false,
	},
	copilot: {
		label: 'GitHub Copilot (./.github/instructions)',
		dir: (cwd) => path.join(cwd, '.github/instructions'),
		format: 'copilot',
		selected: false,
	},
};

// Copies a skill directory, substituting org-alias placeholders in any
// Markdown file along the way (binary/other files are copied as-is).
function copySkillDir(src, dest, aliases) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copySkillDir(srcPath, destPath, aliases);
		} else if (entry.name.endsWith('.md')) {
			const content = applyAliases(fs.readFileSync(srcPath, 'utf8'), aliases);
			fs.writeFileSync(destPath, content);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

// Skills reference the reader's own org setup via {{PROD_ORG_ALIAS}} /
// {{DEV_ORG_ALIAS}} placeholders instead of a hardcoded org alias.
function hasAliasPlaceholders(content) {
	return /\{\{(PROD|DEV)_ORG_ALIAS\}\}/.test(content);
}

function applyAliases(content, aliases = {}) {
	return content
		.replace(/\{\{PROD_ORG_ALIAS\}\}/g, aliases.prod || '<PROD_ORG_ALIAS>')
		.replace(/\{\{DEV_ORG_ALIAS\}\}/g, aliases.dev || '<DEV_ORG_ALIAS>');
}

function listSkills() {
	return fs
		.readdirSync(SKILLS_SRC, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => e.name);
}

// Pulls `name`/`description` out of the SKILL.md frontmatter (YAML folded
// scalar style: "description: >") so non-Claude formats can reuse them.
function parseSkill(skillName) {
	const raw = fs.readFileSync(
		path.join(SKILLS_SRC, skillName, 'SKILL.md'),
		'utf8',
	);
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return { name: skillName, description: '', body: raw, raw };

	const fmLines = match[1].split(/\r?\n/);
	const body = match[2].replace(/^\r?\n/, '');
	let description = '';

	for (let i = 0; i < fmLines.length; i++) {
		if (/^description:\s*>-?\s*$/.test(fmLines[i])) {
			const descLines = [];
			let j = i + 1;
			for (; j < fmLines.length; j++) {
				if (/^\S/.test(fmLines[j])) break;
				descLines.push(fmLines[j].trim());
			}
			description = descLines.filter(Boolean).join(' ');
			break;
		}
		const inline = fmLines[i].match(/^description:\s*(.+)$/);
		if (inline) {
			description = inline[1].trim();
			break;
		}
	}

	return { name: skillName, description, body, raw };
}

const FORMATTERS = {
	cursor: (skill) =>
		`---\ndescription: ${JSON.stringify(skill.description)}\nalwaysApply: false\n---\n\n${skill.body}`,
	windsurf: (skill) =>
		`---\ntrigger: model_decision\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.body}`,
	copilot: (skill) =>
		`---\napplyTo: "**"\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.body}`,
};

const EXT = { cursor: '.mdc', windsurf: '.md', copilot: '.instructions.md' };

function installSkillToTarget(skillName, targetKey, cwd, aliases = {}) {
	const targetDef = TARGETS[targetKey];
	const destDir = targetDef.dir(cwd);
	fs.mkdirSync(destDir, { recursive: true });

	if (targetDef.format === 'claude') {
		copySkillDir(
			path.join(SKILLS_SRC, skillName),
			path.join(destDir, skillName),
			aliases,
		);
		return;
	}

	const skill = parseSkill(skillName);
	skill.body = applyAliases(skill.body, aliases);
	const content = FORMATTERS[targetDef.format](skill);
	fs.writeFileSync(
		path.join(destDir, `${skillName}${EXT[targetDef.format]}`),
		content,
	);
}

function aliasesFromEnv() {
	return {
		prod: process.env.ACEK_PROD_ORG_ALIAS || '',
		dev: process.env.ACEK_DEV_ORG_ALIAS || '',
	};
}

function warnIfAliasesUnresolved(skillNames, aliases) {
	if (aliases.prod && aliases.dev) return;
	const needsAliases = skillNames.some((s) =>
		hasAliasPlaceholders(parseSkill(s).raw),
	);
	if (!needsAliases) return;
	console.log(
		'\nℹ️  Some installed skills reference your org aliases. Set them with\n' +
			'   ACEK_PROD_ORG_ALIAS=<alias> ACEK_DEV_ORG_ALIAS=<alias> before installing,\n' +
			'   or find-and-replace <PROD_ORG_ALIAS> / <DEV_ORG_ALIAS> afterwards.',
	);
}

async function runInteractiveInstall() {
	let prompts;
	try {
		prompts = require('prompts');
	} catch {
		console.error(
			'❌ Interactive mode requires the "prompts" package, which should have been installed automatically.\n' +
				'   Try: npx acek-skills@latest install',
		);
		process.exit(1);
	}

	const onCancel = () => {
		console.log('\n👋 Cancelled, nothing was installed.');
		process.exit(0);
	};

	const available = listSkills();
	const { skills } = await prompts(
		{
			type: 'multiselect',
			name: 'skills',
			message: 'Select the skills to install',
			instructions: false,
			hint: '- Space to select, Enter to confirm, a to toggle all',
			choices: available.map((s) => ({ title: s, value: s, selected: true })),
			min: 1,
		},
		{ onCancel },
	);

	const { targets } = await prompts(
		{
			type: 'multiselect',
			name: 'targets',
			message: 'Select the target IDE(s) / tool(s)',
			instructions: false,
			hint: '- Space to select, Enter to confirm',
			choices: Object.entries(TARGETS).map(([value, t]) => ({
				title: t.label,
				value,
				selected: t.selected,
			})),
			min: 1,
		},
		{ onCancel },
	);

	let aliases = {};
	const needsAliases = skills.some((s) =>
		hasAliasPlaceholders(parseSkill(s).raw),
	);
	if (needsAliases) {
		aliases = await prompts(
			[
				{
					type: 'text',
					name: 'prod',
					message: 'Production org alias (e.g. Acme_Production) — leave blank to fill in later',
				},
				{
					type: 'text',
					name: 'dev',
					message: 'Sandbox / dev org alias (e.g. Acme_Dev) — leave blank to fill in later',
				},
			],
			{ onCancel },
		);
	}

	const cwd = process.cwd();
	for (const targetKey of targets) {
		for (const skillName of skills) {
			installSkillToTarget(skillName, targetKey, cwd, aliases);
		}
		console.log(`✅ ${skills.length} skill(s) installed to ${TARGETS[targetKey].label}`);
	}
	warnIfAliasesUnresolved(skills, aliases);
	console.log('\n🎉 Done!');
}

async function main() {
	if (command === 'install') {
		if (target === '--all') {
			const available = listSkills();
			const aliases = aliasesFromEnv();
			for (const skill of available) {
				installSkillToTarget(skill, 'claude-project', process.cwd(), aliases);
			}
			console.log(
				`✅ All ${available.length} skill(s) installed to ${TARGETS['claude-project'].label}`,
			);
			warnIfAliasesUnresolved(available, aliases);
		} else if (target) {
			const available = listSkills();
			if (!available.includes(target)) {
				console.error(
					`❌ Skill "${target}" not found. Available: ${available.join(', ')}`,
				);
				process.exit(1);
			}
			const aliases = aliasesFromEnv();
			installSkillToTarget(target, 'claude-project', process.cwd(), aliases);
			console.log(`✅ Installed skill: ${target} → ${TARGETS['claude-project'].label}`);
			warnIfAliasesUnresolved([target], aliases);
		} else {
			await runInteractiveInstall();
		}
	} else if (command === 'list') {
		console.log('📦 Available skills:');
		listSkills().forEach((s) => console.log(`  - ${s}`));
	} else {
		console.log(`
Usage:
  acek-skills install              Interactive: pick skills, target IDE(s)/tool(s), and org aliases
  acek-skills install --all        Install all skills to Claude Code (project), no prompts
  acek-skills install <name>       Install a single skill to Claude Code (project), no prompts

  acek-skills list                 List available skills

Some skills reference your Salesforce org aliases. For non-interactive installs,
set these env vars to fill them in automatically:
  ACEK_PROD_ORG_ALIAS=<alias>  ACEK_DEV_ORG_ALIAS=<alias>  acek-skills install --all
`);
	}
}

main();
