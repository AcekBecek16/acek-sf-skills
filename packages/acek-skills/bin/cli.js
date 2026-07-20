#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const command = args[0];
const target = args[1]; // optional: specific skill name, or "--all"

const SKILLS_SRC = path.join(__dirname, '../skills');
const COMMANDS_SRC = path.join(__dirname, '../commands');
const AGENTS_SRC = path.join(__dirname, '../agents');

function printBanner() {
	console.log(`\x1b[36m
  ____  _  _____ _     _     ____
 / ___|| |/ /_ _| |   | |   / ___|
 \\___ \\| ' / | || |   | |   \\___ \\
  ___) | . \\ | || |___| |___ ___) |
 |____/|_|\\_\\___|_____|_____|____/\x1b[0m
\x1b[2mSalesforce skills for Claude Code\x1b[0m
`);
}

// Where each target/tool expects its instruction files, and how to format them.
const TARGETS = {
	'claude-project': {
		label: 'Claude Code — project (./.claude/skills)',
		dir: (cwd) => path.join(cwd, '.claude/skills'),
		commandsDir: (cwd) => path.join(cwd, '.claude/commands'),
		agentDir: (cwd) => path.join(cwd, '.claude/agents'),
		format: 'claude',
		selected: true,
	},
	'claude-global': {
		label: 'Claude Code — global (~/.claude/skills)',
		dir: () => path.join(os.homedir(), '.claude/skills'),
		commandsDir: () => path.join(os.homedir(), '.claude/commands'),
		agentDir: () => path.join(os.homedir(), '.claude/agents'),
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
// `skip` excludes filenames at the top level (used to drop SKILL.md when
// mirroring a skill's supporting files next to a converted rule file).
function copySkillDir(src, dest, aliases, skip = new Set()) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		if (skip.has(entry.name)) continue;
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

// Slash commands are a Claude-Code-specific concept (single .md file per
// command under .claude/commands/) — unlike skills, they have no equivalent
// in Cursor/Windsurf/Copilot, so they only ever install to 'claude' format
// targets.
function listCommands() {
	if (!fs.existsSync(COMMANDS_SRC)) return [];
	return fs
		.readdirSync(COMMANDS_SRC, { withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith('.md'))
		.map((e) => e.name.replace(/\.md$/, ''));
}

function installCommandToTarget(commandName, targetKey, cwd, aliases = {}) {
	const targetDef = TARGETS[targetKey];
	if (targetDef.format !== 'claude' || !targetDef.commandsDir) return;
	const destDir = targetDef.commandsDir(cwd);
	fs.mkdirSync(destDir, { recursive: true });
	const content = applyAliases(
		fs.readFileSync(path.join(COMMANDS_SRC, `${commandName}.md`), 'utf8'),
		aliases,
	);
	fs.writeFileSync(path.join(destDir, `${commandName}.md`), content);
}

// Sub-agents (.claude/agents/*.md) are dispatched by ashley-fires via the
// Agent tool (subagent_type: <skill's technical id>) — one per owner skill,
// same technical id as the matching skill folder. Like commands, they're a
// Claude-Code-only concept: Cursor/Windsurf/Copilot have no subagent
// equivalent, so they only ever install to 'claude' format targets.
function listAgents() {
	if (!fs.existsSync(AGENTS_SRC)) return [];
	return fs
		.readdirSync(AGENTS_SRC, { withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith('.md'))
		.map((e) => e.name.replace(/\.md$/, ''));
}

function installAgentToTarget(agentName, targetKey, cwd) {
	const targetDef = TARGETS[targetKey];
	if (targetDef.format !== 'claude' || !targetDef.agentDir) return;
	const destDir = targetDef.agentDir(cwd);
	fs.mkdirSync(destDir, { recursive: true });
	fs.copyFileSync(
		path.join(AGENTS_SRC, `${agentName}.md`),
		path.join(destDir, `${agentName}.md`),
	);
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

	// Carry over supporting files (e.g. references/) alongside the converted
	// rule file — these tools don't have Claude Code's skill directory, so we
	// mirror it as <skillName>/ next to the main rule file.
	const skillDir = path.join(SKILLS_SRC, skillName);
	const extras = fs.readdirSync(skillDir).filter((f) => f !== 'SKILL.md');
	if (extras.length > 0) {
		copySkillDir(
			skillDir,
			path.join(destDir, skillName),
			aliases,
			new Set(['SKILL.md']),
		);
	}
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
	printBanner();

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
					message:
						'Production org alias (e.g. Acme_Production) — leave blank to fill in later',
				},
				{
					type: 'text',
					name: 'dev',
					message:
						'Sandbox / dev org alias (e.g. Acme_Dev) — leave blank to fill in later',
				},
			],
			{ onCancel },
		);
	}

	const availableAgents = listAgents();
	const cwd = process.cwd();
	for (const targetKey of targets) {
		for (const skillName of skills) {
			installSkillToTarget(skillName, targetKey, cwd, aliases);
		}
		console.log(
			`✅ ${skills.length} skill(s) installed to ${TARGETS[targetKey].label}`,
		);

		const agentsToInstall = skills.filter((s) => availableAgents.includes(s));
		if (agentsToInstall.length > 0 && TARGETS[targetKey].agentDir) {
			for (const agentName of agentsToInstall) {
				installAgentToTarget(agentName, targetKey, cwd);
			}
			console.log(
				`✅ ${agentsToInstall.length} sub-agent(s) installed to ${TARGETS[targetKey].label}`,
			);
		}

		if (skills.includes('ashley-fires') && TARGETS[targetKey].commandsDir) {
			installCommandToTarget('sf-init', targetKey, cwd, aliases);
			console.log(
				`✅ /sf-init command installed to ${TARGETS[targetKey].label}`,
			);
		}
	}
	warnIfAliasesUnresolved(skills, aliases);
	if (
		skills.includes('ashley-fires') &&
		targets.some((t) => TARGETS[t].commandsDir)
	) {
		console.log(
			'\n💡 Run /sf-init in your project to bootstrap architecture.md — ashley-fires reads it\n' +
				'   on every plan afterward instead of re-scanning the whole project each time.',
		);
	}
	console.log('\n🎉 Done!');
}

async function main() {
	if (command === 'install') {
		if (target === '--all') {
			printBanner();
			const available = listSkills();
			const aliases = aliasesFromEnv();
			for (const skill of available) {
				installSkillToTarget(skill, 'claude-project', process.cwd(), aliases);
			}
			console.log(
				`✅ All ${available.length} skill(s) installed to ${TARGETS['claude-project'].label}`,
			);
			const agentsToInstall = listAgents().filter((a) =>
				available.includes(a),
			);
			for (const agentName of agentsToInstall) {
				installAgentToTarget(agentName, 'claude-project', process.cwd());
			}
			if (agentsToInstall.length > 0) {
				console.log(
					`✅ ${agentsToInstall.length} sub-agent(s) installed to ${TARGETS['claude-project'].label}`,
				);
			}
			if (available.includes('ashley-fires')) {
				installCommandToTarget(
					'sf-init',
					'claude-project',
					process.cwd(),
					aliases,
				);
				console.log(
					`✅ /sf-init command installed to ${TARGETS['claude-project'].label}`,
				);
				console.log(
					'\n💡 Run /sf-init in your project to bootstrap architecture.md — ashley-fires reads it\n' +
						'   on every plan afterward instead of re-scanning the whole project each time.',
				);
			}
			warnIfAliasesUnresolved(available, aliases);
		} else if (target) {
			printBanner();
			const available = listSkills();
			if (!available.includes(target)) {
				console.error(
					`❌ Skill "${target}" not found. Available: ${available.join(', ')}`,
				);
				process.exit(1);
			}
			const aliases = aliasesFromEnv();
			installSkillToTarget(target, 'claude-project', process.cwd(), aliases);
			console.log(
				`✅ Installed skill: ${target} → ${TARGETS['claude-project'].label}`,
			);
			if (listAgents().includes(target)) {
				installAgentToTarget(target, 'claude-project', process.cwd());
				console.log(
					`✅ Installed sub-agent: ${target} → ${TARGETS['claude-project'].label}`,
				);
			}
			if (target === 'ashley-fires') {
				installCommandToTarget(
					'sf-init',
					'claude-project',
					process.cwd(),
					aliases,
				);
				console.log(
					`✅ /sf-init command installed to ${TARGETS['claude-project'].label}`,
				);
				console.log(
					'\n💡 Run /sf-init in your project to bootstrap architecture.md — ashley-fires reads it\n' +
						'   on every plan afterward instead of re-scanning the whole project each time.',
				);
			}
			warnIfAliasesUnresolved([target], aliases);
		} else {
			await runInteractiveInstall();
		}
	} else if (command === 'list') {
		console.log('📦 Available skills:');
		listSkills().forEach((s) => console.log(`  - ${s}`));
		const commands = listCommands();
		if (commands.length > 0) {
			console.log('\n⚡ Available commands:');
			commands.forEach((c) => console.log(`  - /${c}`));
		}
		const agents = listAgents();
		if (agents.length > 0) {
			console.log('\n🤖 Available sub-agents (dispatched by ashley-fires):');
			agents.forEach((a) => console.log(`  - ${a}`));
		}
	} else {
		console.log(`
Usage:
  acek-skills install              Interactive: pick skills, target IDE(s)/tool(s), and org aliases
  acek-skills install --all        Install all skills to Claude Code (project), no prompts
  acek-skills install <name>       Install a single skill to Claude Code (project), no prompts

  acek-skills list                 List available skills, commands, and sub-agents

Each installed skill that has a matching sub-agent (same technical id, e.g. channel-preston) also installs
that sub-agent to .claude/agents/ (Claude Code targets only — Cursor/Windsurf/Copilot have no
subagent equivalent). ashley-fires dispatches these during Phase 4 execution instead of following
their conventions itself.

Installing ashley-fires also installs its companion /sf-init slash command (Claude Code targets
only — Cursor/Windsurf/Copilot have no slash-command equivalent). Run /sf-init once per project
to bootstrap architecture.md; ashley-fires reads it on every plan afterward.

Some skills reference your Salesforce org aliases. For non-interactive installs,
set these env vars to fill them in automatically:
  ACEK_PROD_ORG_ALIAS=<alias>  ACEK_DEV_ORG_ALIAS=<alias>  acek-skills install --all
`);
	}
}

main();
