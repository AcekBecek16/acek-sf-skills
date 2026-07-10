#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const command = args[0];

const SKILL_NAME = 'shaiden';
const SKILL_SRC = path.join(__dirname, '../skills', SKILL_NAME);

function printBanner() {
	console.log(`\x1b[35m
  ____  _   _    _    ___ ____  _____ _   _
 / ___|| | | |  / \\  |_ _|  _ \\| ____| \\ | |
 \\___ \\| |_| | / _ \\  | || | | |  _| |  \\| |
  ___) |  _  |/ ___ \\ | || |_| | |___| |\\  |
 |____/|_| |_/_/   \\_\\___|____/|_____|_| \\_|\x1b[0m
\x1b[2m紫電 · LWC Design Precision\x1b[0m
`);
}

// Where each target/tool expects its instruction files, and how to format them.
const TARGETS = {
	'claude-project': {
		label: 'Claude Code — project (./.claude/skills)',
		dir: (cwd) => path.join(cwd, '.claude/skills'),
		format: 'claude',
		selected: true,
	},
	'claude-global': {
		label: 'Claude Code — global (~/.claude/skills)',
		dir: () => path.join(os.homedir(), '.claude/skills'),
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

// Copies a directory, skipping any filenames in `skip`. Markdown files get
// their content passed through as-is (no placeholders to resolve — shaiden
// has none), other files are copied verbatim.
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

function parseSkill() {
	const raw = fs.readFileSync(path.join(SKILL_SRC, 'SKILL.md'), 'utf8');
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

function installToTarget(targetKey, cwd) {
	const targetDef = TARGETS[targetKey];
	const destDir = targetDef.dir(cwd);
	fs.mkdirSync(destDir, { recursive: true });

	if (targetDef.format === 'claude') {
		copyDir(SKILL_SRC, path.join(destDir, SKILL_NAME));
		return;
	}

	const skill = parseSkill();
	const content = FORMATTERS[targetDef.format](skill);
	fs.writeFileSync(
		path.join(destDir, `${SKILL_NAME}${EXT[targetDef.format]}`),
		content,
	);

	// Carry over supporting files (e.g. references/) alongside the converted
	// rule file — these tools don't have Claude Code's skill directory, so we
	// mirror it as <skillName>/ next to the main rule file.
	const extras = fs
		.readdirSync(SKILL_SRC)
		.filter((f) => f !== 'SKILL.md');
	if (extras.length > 0) {
		copyDir(SKILL_SRC, path.join(destDir, SKILL_NAME), new Set(['SKILL.md']));
	}
}

async function runInteractiveInstall() {
	printBanner();

	let prompts;
	try {
		prompts = require('prompts');
	} catch {
		console.error(
			'❌ Interactive mode requires the "prompts" package, which should have been installed automatically.\n' +
				'   Try: npx shaiden@latest install',
		);
		process.exit(1);
	}

	const onCancel = () => {
		console.log('\n👋 Cancelled, nothing was installed.');
		process.exit(0);
	};

	const { targets } = await prompts(
		{
			type: 'multiselect',
			name: 'targets',
			message: 'Select the target IDE(s) / tool(s) for shaiden',
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
		console.log(`✅ shaiden installed to ${TARGETS[targetKey].label}`);
	}
	console.log('\n🎉 Done!');
}

async function main() {
	if (command === 'install') {
		if (args[1] === '--all') {
			printBanner();
			installToTarget('claude-project', process.cwd());
			console.log(`✅ shaiden installed to ${TARGETS['claude-project'].label}`);
		} else {
			await runInteractiveInstall();
		}
	} else {
		console.log(`
Usage:
  shaiden install              Interactive: pick the target IDE(s)/tool(s)
  shaiden install --all        Install to Claude Code (project), no prompts
`);
	}
}

main();
