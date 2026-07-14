#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const command = args[0];

const SKILLS_SRC = path.join(__dirname, '../skills');
const COMMANDS_SRC = path.join(__dirname, '../commands');
const AGENTS_SRC = path.join(__dirname, '../agents');

const SKILL_NAMES = ['ashley', 'eva'];
const AGENT_NAMES = ['commatoze', 'isla', 'asa', 'channel'];

function printBanner() {
	console.log('\x1b[35m%s\x1b[0m', '  A S H L E Y  +  E V A');
	console.log('\x1b[2m%s\x1b[0m\n', '  idea-to-plan for Next.js + Supabase SaaS');
}

// Where each target/tool expects its instruction files. Only claude-project
// and claude-global understand subagents (.claude/agents) and commands
// (.claude/commands) — the other targets get each skill's own workflow
// mirrored as a flattened rule file, but commatoze/isla/asa/channel and the
// /eva shortcut have no equivalent there, so they're skipped.
const TARGETS = {
	'claude-project': {
		label: 'Claude Code — project (./.claude)',
		skillDir: (cwd) => path.join(cwd, '.claude/skills'),
		agentDir: (cwd) => path.join(cwd, '.claude/agents'),
		commandDir: (cwd) => path.join(cwd, '.claude/commands'),
		format: 'claude',
		selected: true,
	},
	'claude-global': {
		label: 'Claude Code — global (~/.claude)',
		skillDir: () => path.join(os.homedir(), '.claude/skills'),
		agentDir: () => path.join(os.homedir(), '.claude/agents'),
		commandDir: () => path.join(os.homedir(), '.claude/commands'),
		format: 'claude',
		selected: false,
	},
	cursor: {
		label: 'Cursor (./.cursor/rules) — skills only, no subagents/commands',
		skillDir: (cwd) => path.join(cwd, '.cursor/rules'),
		format: 'cursor',
		selected: false,
	},
	windsurf: {
		label: 'Windsurf (./.windsurf/rules) — skills only, no subagents/commands',
		skillDir: (cwd) => path.join(cwd, '.windsurf/rules'),
		format: 'windsurf',
		selected: false,
	},
	copilot: {
		label: 'GitHub Copilot (./.github/instructions) — skills only, no subagents/commands',
		skillDir: (cwd) => path.join(cwd, '.github/instructions'),
		format: 'copilot',
		selected: false,
	},
};

function copyDir(src, dest, skip = new Set()) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		if (skip.has(entry.name)) continue;
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

function parseSkill(skillName) {
	const skillSrc = path.join(SKILLS_SRC, skillName);
	const raw = fs.readFileSync(path.join(skillSrc, 'SKILL.md'), 'utf8');
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return { description: '', body: raw };

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

	return { description, body };
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

// Ensures .ashley/ (where concept.md, architecture.md, and plan-*.md files
// live) is gitignored, per the rule that plan and architecture documents
// never get committed — this covers both ashley's and eva's output.
function ensureGitignore(cwd) {
	const gitignorePath = path.join(cwd, '.gitignore');
	const entry = '.ashley/';
	let content = '';
	if (fs.existsSync(gitignorePath)) {
		content = fs.readFileSync(gitignorePath, 'utf8');
		if (content.split(/\r?\n/).some((line) => line.trim() === entry)) return;
	}
	const sep = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
	fs.writeFileSync(
		gitignorePath,
		`${content}${sep}\n# ashley + eva plan/concept/architecture docs — never committed\n${entry}\n`,
	);
}

function installToTarget(targetKey, cwd) {
	const targetDef = TARGETS[targetKey];

	if (targetDef.format === 'claude') {
		for (const name of SKILL_NAMES) {
			copyDir(path.join(SKILLS_SRC, name), path.join(targetDef.skillDir(cwd), name));
		}

		const agentDir = targetDef.agentDir(cwd);
		fs.mkdirSync(agentDir, { recursive: true });
		for (const name of AGENT_NAMES) {
			fs.copyFileSync(
				path.join(AGENTS_SRC, `${name}.md`),
				path.join(agentDir, `${name}.md`),
			);
		}

		if (fs.existsSync(COMMANDS_SRC)) {
			const commandDir = targetDef.commandDir(cwd);
			fs.mkdirSync(commandDir, { recursive: true });
			for (const entry of fs.readdirSync(COMMANDS_SRC, { withFileTypes: true })) {
				if (!entry.isDirectory()) {
					fs.copyFileSync(
						path.join(COMMANDS_SRC, entry.name),
						path.join(commandDir, entry.name),
					);
				}
			}
		}

		if (targetKey === 'claude-project') ensureGitignore(cwd);
		return;
	}

	const destDir = targetDef.skillDir(cwd);
	fs.mkdirSync(destDir, { recursive: true });
	for (const name of SKILL_NAMES) {
		const skillSrc = path.join(SKILLS_SRC, name);
		const skill = parseSkill(name);
		const content = FORMATTERS[targetDef.format](skill);
		fs.writeFileSync(path.join(destDir, `${name}${EXT[targetDef.format]}`), content);

		const extras = fs.readdirSync(skillSrc).filter((f) => f !== 'SKILL.md');
		if (extras.length > 0) {
			copyDir(skillSrc, path.join(destDir, name), new Set(['SKILL.md']));
		}
	}
}

async function runInteractiveInstall() {
	printBanner();

	let prompts;
	try {
		prompts = require('prompts');
	} catch {
		console.error(
			'\u274c Interactive mode requires the "prompts" package, which should have been installed automatically.\n' +
				'   Try: npx @nullbotdotexe/ashley@latest install',
		);
		process.exit(1);
	}

	const onCancel = () => {
		console.log('\n\ud83d\udc4b Cancelled, nothing was installed.');
		process.exit(0);
	};

	const { targets } = await prompts(
		{
			type: 'multiselect',
			name: 'targets',
			message: 'Select the target IDE(s) / tool(s) for ashley + eva',
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

	const cwd = process.cwd();
	for (const targetKey of targets) {
		installToTarget(targetKey, cwd);
		console.log(`\u2705 ashley + eva installed to ${TARGETS[targetKey].label}`);
	}
	console.log(
		'\n\ud83c\udf89 Done! Start with "/eva" for a raw idea, or "ashley plan <feature>" for a concrete one.',
	);
}

async function main() {
	if (command === 'install') {
		if (args[1] === '--all') {
			printBanner();
			installToTarget('claude-project', process.cwd());
			console.log(`\u2705 ashley + eva installed to ${TARGETS['claude-project'].label}`);
			console.log(
				'\n\ud83c\udf89 Done! Start with "/eva" for a raw idea, or "ashley plan <feature>" for a concrete one.',
			);
		} else {
			await runInteractiveInstall();
		}
	} else {
		console.log(`
Usage:
  ashley install              Interactive: pick the target IDE(s)/tool(s)
  ashley install --all        Install to Claude Code (project), no prompts

This installs:
  .claude/skills/ashley/      Plan-mode orchestrator (technical Discovery/Decisions/Plan/Execute)
  .claude/skills/eva/         Product concept grill (raw idea -> concept.md)
  .claude/agents/             commatoze, isla, asa, channel -- the 4 role agents
  .claude/commands/eva.md     Explicit "/eva" shortcut
  .gitignore                  Appends .ashley/ (concept/plan/architecture docs are never committed)
`);
	}
}

main();
