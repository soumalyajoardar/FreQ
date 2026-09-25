package com.gresseymusic.wave.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.gresseymusic.wave.data.settings.UserPreferences
import com.gresseymusic.wave.ui.theme.FreqGlassTone
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography

/**
 * First-launch username onboarding prompt (M25).
 *
 * Prompts the user for a local display name for personalized greetings.
 * Strictly local — no account, email, password, or remote sync.
 */
@Composable
fun OnboardingDialog(
    onSaveName: (String) -> Unit,
    modifier: Modifier = Modifier,
    initialName: String = "",
    title: String = "Welcome to FreQ",
    subtitle: String = "What should we call you?",
    confirmText: String = "Continue",
    onDismissRequest: (() -> Unit)? = null,
) {
    var nameInput by remember { mutableStateOf(initialName) }
    var showError by remember { mutableStateOf(false) }
    val colors = FreqTheme.colors

    Dialog(
        onDismissRequest = { onDismissRequest?.invoke() },
        properties = DialogProperties(
            dismissOnBackPress = onDismissRequest != null,
            dismissOnClickOutside = onDismissRequest != null,
            usePlatformDefaultWidth = false,
        ),
    ) {
        Box(
            modifier = modifier
                .fillMaxWidth(0.92f)
                .widthIn(max = 420.dp)
                .clip(FreqShapes.cardLarge),
        ) {
            FreqGlassSurface(
                tone = FreqGlassTone.Floating,
                shape = FreqShapes.cardLarge,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(FreqSpacing.lg),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = title,
                        style = Typography.headlineSmall,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                    Text(
                        text = subtitle,
                        style = Typography.bodyMedium,
                        color = colors.textSecondary,
                    )

                    Spacer(modifier = Modifier.height(FreqSpacing.md))

                    // Text Input field (no outline; error shown via helper text).
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(FreqShapes.card)
                            .background(colors.surfaceElevated)
                            .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
                    ) {
                        if (nameInput.isEmpty()) {
                            Text(
                                text = "Your name",
                                style = Typography.bodyMedium,
                                color = colors.textMuted,
                            )
                        }
                        BasicTextField(
                            value = nameInput,
                            onValueChange = {
                                if (it.length <= UserPreferences.MAX_USERNAME_LENGTH) {
                                    nameInput = it
                                    if (showError && it.isNotBlank()) showError = false
                                }
                            },
                            textStyle = Typography.bodyMedium.copy(color = colors.textPrimary),
                            cursorBrush = SolidColor(colors.textSecondary),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.Words,
                                imeAction = ImeAction.Done,
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    if (nameInput.trim().isNotBlank()) {
                                        onSaveName(nameInput.trim())
                                    } else {
                                        showError = true
                                    }
                                },
                            ),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    if (showError) {
                        Spacer(modifier = Modifier.height(FreqSpacing.xxs))
                        Text(
                            text = "Please enter your name",
                            style = Typography.labelSmall,
                            color = colors.error,
                            modifier = Modifier.align(Alignment.Start),
                        )
                    }

                    Spacer(modifier = Modifier.height(FreqSpacing.lg))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (onDismissRequest != null) {
                            FreqGhostButton(
                                text = "Cancel",
                                onClick = onDismissRequest,
                                modifier = Modifier.padding(end = FreqSpacing.sm),
                            )
                        }
                        FreqPrimaryButton(
                            text = confirmText,
                            onClick = {
                                if (nameInput.trim().isNotBlank()) {
                                    onSaveName(nameInput.trim())
                                } else {
                                    showError = true
                                }
                            },
                            modifier = Modifier.fillMaxWidth(if (onDismissRequest != null) 0.6f else 1f),
                        )
                    }
                }
            }
        }
    }
}
